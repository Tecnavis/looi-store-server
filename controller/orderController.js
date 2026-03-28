const User = require('../models/userModel');
const Order = require('../models/orderModel');
const Product = require('../models/productModel');
const asyncHandler = require('express-async-handler');
const OrderCount = require('../models/orderCountModel');
const sendEmail = require('../utils/emailService');
const { postOrderToShiprocket, cancelOrderInShiprocket } = require('../utils/shiprocketService');

const generateOrderId = () => {
    return `ORD-${Math.random().toString(36).substr(2, 9).toUpperCase()}`; // Generates an ID like "ORD-ABCD12345"
};

// orderController.js
// exports.createOrder = async (req, res) => {
//     try {
//         const {
//             user,
//             orderItems,
//             shippingAddress,
//             paymentMethod,
//             paymentStatus,
//             totalAmount,
//             razorpayOrderId,
//             razorpayPaymentId,
//             email
//         } = req.body;

//         // Validate required fields
//         if (!user || !orderItems || !shippingAddress || !paymentMethod || !totalAmount) {
//             return res.status(400).json({ 
//                 success: false, 
//                 message: 'Missing required fields' 
//             });
//         }

//         // First create the order object without saving it
//         const orderData = {
//             orderId: generateOrderId(),
//             user,
//             orderItems,
//             shippingAddress,
//             paymentMethod,
//             paymentStatus,
//             totalAmount,
//             razorpayOrderId,
//             razorpayPaymentId,
//             email,
//             orderStatus: 'Pending',
//             orderDate: new Date()
//         };

//         // Create order in Shiprocket first
//         try {
//             const shiprocketResponse = await postOrderToShiprocket(orderData);
            
//             if (!shiprocketResponse || !shiprocketResponse.order_id) {
//                 throw new Error('Failed to get Shiprocket order ID');
//             }

//             // Add the Shiprocket order ID to the order data
//             orderData.shiprocket_order_id = shiprocketResponse.order_id;

//             // Now create the order in your database with all required fields
//             const order = await Order.create(orderData);

//             // Send confirmation email
//             const orderItemsHtml = orderItems.map(item => `
//                 <li>
//                     <strong>${item.productName}</strong> - ${item.quantity} x ₹${item.price} = ₹${item.quantity * item.price}
//                 </li>
//             `).join('');

//             await sendEmail(
//                 order.email,
//                 'Order Confirmation',
//                 `Your order #${order.orderId} has been placed successfully.`,
//                 `
//                     <p>Thank you for your order! Your order ID is <strong>${order.orderId}</strong>.</p>
//                     <p><strong>Order Details:</strong></p>
//                     <ul>${orderItemsHtml}</ul>
//                     <p><strong>Total Amount:</strong> ₹${order.totalAmount}</p>
//                     <p>We will notify you when your order is shipped.</p>
//                 `
//             );

//             // Update user's orders array
//             await User.findByIdAndUpdate(
//                 user,
//                 { $push: { orders: order._id } },
//                 { new: true }
//             );

//             res.status(200).json({
//                 success: true,
//                 message: 'Order created successfully',
//                 order,
//                 shiprocketResponse
//             });

//         } catch (shiprocketError) {
//             console.error('Shiprocket Error:', shiprocketError);
//             return res.status(500).json({
//                 success: false,
//                 message: 'Failed to create shipping order',
//                 error: shiprocketError.message
//             });
//         }

//     } catch (error) {
//         console.error('Error creating order:', error);
//         res.status(500).json({
//             success: false,
//             message: 'Failed to create order',
//             error: error.message
//         });
//     }
// };

exports.createOrder = async (req, res) => {
    try {
        const {
            user,
            orderItems,
            shippingAddress,
            paymentMethod,
            paymentStatus,
            totalAmount,
            razorpayOrderId,
            razorpayPaymentId,
            email,
            skipShipping   // client can pass true to bypass courier API
        } = req.body;

        // Validate required fields
        if (!user || !orderItems || !shippingAddress || !paymentMethod || !totalAmount) {
            return res.status(400).json({ 
                success: false, 
                message: 'Missing required fields' 
            });
        }

        // Validate and enrich order items with product details
        const enrichedOrderItems = [];
        for (let item of orderItems) {
            // Validate only the truly required fields
            if (!item.productName || !item.quantity || !item.price) {
                return res.status(400).json({
                    success: false,
                    message: `Missing required fields (productName, quantity, price) for item: ${item.productName || 'unknown'}`
                });
            }

            // Look up product by _id first (most reliable), then fall back to case-insensitive name
            let product = null;
            const lookupId = item.productId || item.product;
            if (lookupId) {
                try { product = await Product.findById(lookupId); } catch (e) { /* invalid id */ }
            }
            if (!product && item.productName) {
                product = await Product.findOne({
                    name: { $regex: new RegExp('^' + item.productName.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i') }
                });
            }

            // Build enriched item — fall back to cart data if product not in DB
            const enriched = {
                productId:   product ? product._id : (lookupId || null),
                productName: item.productName,
                quantity:    item.quantity,
                price:       item.price,
                color:       item.color  || '',
                size:        item.size   || '',
                hsn:         item.hsn    || (product && product.hsn)    || '',
                sku:         item.sku    || (product && product.sku)    || '',
                length:      item.length || (product && product.length) || 0,
                width:       item.width  || (product && product.width)  || 0,
                height:      item.height || (product && product.height) || 0,
                weight:      item.weight || (product && product.weight) || 0,
                coverImage:  (product && product.coverImage) || '',
            };

            // Only check stock if we found the product and have size/color data
            if (product && item.size && item.color) {
                const sizeObj  = product.sizes && product.sizes.find(function(s) { return s.size === item.size; });
                const colorObj = sizeObj && sizeObj.colors && sizeObj.colors.find(function(c) { return c.color === item.color; });
                if (colorObj && colorObj.stock < item.quantity) {
                    return res.status(400).json({
                        success: false,
                        message: 'Insufficient stock for ' + item.productName + ' (size: ' + item.size + ', color: ' + item.color + ')'
                    });
                }
            }

            enrichedOrderItems.push(enriched);
        }

        // Create order data with enriched items
        const orderData = {
            orderId: generateOrderId(),
            user,
            orderItems: enrichedOrderItems,
            shippingAddress,
            paymentMethod,
            // For COD: Pending. For online: if paymentStatus sent as 'Paid' use it, else Pending (will be updated after Razorpay verify)
            paymentStatus: paymentStatus || 'Pending',
            totalAmount,
            razorpayOrderId: razorpayOrderId || undefined,
            razorpayPaymentId: razorpayPaymentId || undefined,
            email,
            orderStatus: 'Pending',
            orderDate: new Date()
        };

        // ── STEP 1: Save order to DB first (always) ─────────────────────────
        const order = await Order.create(orderData);

        // ── STEP 2: Deduct stock (null-safe) ─────────────────────────────────
        for (let item of enrichedOrderItems) {
            if (!item.productId || !item.size || !item.color) continue;
            try {
                const product = await Product.findById(item.productId);
                if (!product) continue;
                const sizeObj = product.sizes && product.sizes.find(function(s) { return s.size === item.size; });
                if (!sizeObj) continue;
                const colorObj = sizeObj.colors && sizeObj.colors.find(function(c) { return c.color === item.color; });
                if (!colorObj) continue;
                colorObj.stock = Math.max(0, colorObj.stock - item.quantity);
                await product.save();
            } catch (stockErr) {
                console.error('Stock deduction error (non-fatal):', stockErr.message);
            }
        }

        // ── STEP 3: Link order to user ───────────────────────────────────────
        await User.findByIdAndUpdate(
            user,
            { $push: { orders: order._id } },
            { new: true }
        );

        // ── STEP 4: Send confirmation email (non-blocking) ───────────────────
        const orderItemsHtml = enrichedOrderItems.map(item => `
            <li>
                <strong>${item.productName}</strong> - ${item.quantity} x ₹${item.price} = ₹${item.quantity * item.price}
                <br>Size: ${item.size}, Color: ${item.color}
            </li>
        `).join('');

        sendEmail(
            order.email || email,
            'Order Confirmation',
            `Your order #${order.orderId} has been placed successfully.`,
            `
                <p>Thank you for your order! Your order ID is <strong>${order.orderId}</strong>.</p>
                <p><strong>Order Details:</strong></p>
                <ul>${orderItemsHtml}</ul>
                <p><strong>Total Amount:</strong> ₹${order.totalAmount}</p>
                <p>We will notify you when your order is shipped.</p>
            `
        ).catch(emailErr => console.error('Email send failed (non-fatal):', emailErr.message));

        // ── STEP 5: Attempt Shiprocket (non-fatal, skippable) ────────────────
        if (!skipShipping) {
            try {
                const shiprocketResponse = await postOrderToShiprocket({
                    ...orderData,
                    _id: order._id   // pass DB id so shiprocketService can update shipment details
                });
                if (shiprocketResponse && shiprocketResponse.order_id) {
                    order.shiprocket_order_id = shiprocketResponse.order_id;
                    await order.save();
                }
            } catch (shiprocketError) {
                // Log but do NOT fail the order — it is already saved in DB
                console.error('Shiprocket Error (non-fatal):', shiprocketError.message);
            }
        }

        return res.status(200).json({
            success: true,
            message: 'Order created successfully',
            order
        });

    } catch (error) {
        console.error('Error creating order:', error);
        // Log full validation errors for debugging
        if (error.name === 'ValidationError') {
            const fields = Object.keys(error.errors).join(', ');
            console.error('Mongoose ValidationError fields:', fields);
            return res.status(500).json({
                success: false,
                message: 'Order validation failed: ' + fields,
                error: error.message
            });
        }
        return res.status(500).json({
            success: false,
            message: 'Failed to create order',
            error: error.message
        });
    }
};


// Order Success Handler
exports.orderSuccessHandler = asyncHandler(async (req, res) => {
    const { orderId } = req.body;
    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    order.orderStatus = 'Success';
    await order.save();

    // Inline stock update (no external service needed)
    for (const item of order.orderItems) {
        const product = await Product.findById(item.productId);
        if (product) {
            const sizeObj = product.sizes.find(s => s.size === item.size);
            if (sizeObj) {
                const colorObj = sizeObj.colors.find(c => c.color === item.color);
                if (colorObj && colorObj.stock >= item.quantity) {
                    colorObj.stock -= item.quantity;
                    await product.save();
                }
            }
        }
    }

    res.status(200).json({
        success: true,
        message: 'Order processed successfully, and stock updated',
    });
});

exports.getAllOrders = async (req, res) => {
    try {
        // Find all orders and populate user and orderItems details
        const orders = await Order.find()
            .populate({
                path: 'user',
                model: 'user', 
                select: 'name email' 
            })
            .populate({
                path: 'orderItems.productId',  // fixed: was product_id
                model: 'Product', 
                select: 'name price coverImage' 
            })
            .sort({ orderDate: -1 }); 

        res.status(200).json({
            success: true,
            count: orders.length,
            message: 'Orders retrieved successfully',
            orders
        });
    } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch orders',
            error: error.message
        });
    }
};

// get by id
exports.getOrderById = async (req, res) => {
    try {
        const { orderId } = req.params; 

        // Find the order by ID and populate user and orderItems details
        const order = await Order.findById(orderId)
            .populate({
                path: 'user',
                model: 'user',
                select: 'name email' 
            })
            .populate({
                path: 'orderItems.productId',  // fixed: was product_id
                model: 'Product',
                select: 'name price coverImage' 
            });

        // Check if the order exists
        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Order retrieved successfully',
            order
        });
    } catch (error) {
        console.error('Error fetching order by ID:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch order',
            error: error.message
        });
    }
};
//update order
exports.updateOrderById = async (req, res) => {
    try {
        const { orderId } = req.params;
        const updatedData = req.body;

        // Find the order by ID and update with new data
        const updatedOrder = await Order.findByIdAndUpdate(
            orderId,
            { $set: updatedData },
            { new: true }
        );

        if (!updatedOrder) {
            return res.status(404).json({
                success: false,
                message: 'Order not found',
            });
        }

        res.status(200).json({
            success: true,
            message: 'Order updated successfully',
            order: updatedOrder,
        });
    } catch (error) {
        console.error('Error updating order:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update order',
            error: error.message,
        });
    }
};

exports.getOrdersByUser = async (req, res) => {
    try {
        const userId = req.user._id; // Set by jwtMiddleware

        const orders = await Order.find({ user: userId })
            .populate({
                path: 'orderItems.productId',
                model: 'Product',
                select: 'name price coverImage'
            })
            .populate({
                path: 'user',
                model: 'user',
                select: 'name email'
            });

        if (!orders || orders.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No orders found for this user'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Orders retrieved successfully',
            orders
        });
    } catch (error) {
        console.error('Error fetching orders by user:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch orders',
            error: error.message
        });
    }
};


// get ordercount
exports.getTotalOrderCount = async (req, res) => {
    try {
        const orderCountDoc = await OrderCount.findOne();
        const totalOrderCount = orderCountDoc ? orderCountDoc.count : 0;
        res.status(200).json({ totalOrderCount });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getOrdersByDay = async (req, res) => {
    try {
      const ordersPerDay = await Order.aggregate([
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$orderDate" } },
            orderCount: { $sum: 1 },
            totalSales: { $sum: "$totalAmount" }
          }
        },
        { $sort: { _id: 1 } } // Sort by date
      ]);
  
      res.status(200).json({
        count: ordersPerDay.length,
        message: "Orders per day retrieved successfully",
        ordersPerDay,
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to retrieve orders per day", error });
    }
  };

exports.cancelOrder = async (req, res) => {
    const { orderId } = req.params;
    
    try {
        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        if (order.orderStatus === 'Cancelled') {
            return res.status(400).json({
                success: false,
                message: 'Order is already cancelled'
            });
        }

        if (order.orderStatus === 'Shipped') {
            return res.status(400).json({
                success: false,
                message: 'Cannot cancel order that has been shipped'
            });
        }

        try {
            const shiprocketResponse = await cancelOrderInShiprocket({
                orderId: order.orderId,
                shiprocket_order_id: order.shiprocket_order_id
            });

            Object.assign(order, {
                orderStatus: 'Cancelled',
                cancellationDate: new Date(),
                cancellationReason: req.body.reason || 'Customer requested cancellation',
                shiprocketCancellationResponse: shiprocketResponse
            });
            await order.save();

            await sendEmail(
                order.email,
                'Order Cancellation Confirmation',
                `Your order #${order.orderId} has been cancelled successfully.`,
                `
                    <h2>Order Cancellation Confirmation</h2>
                    <p>Your order #${order.orderId} has been cancelled successfully.</p>
                    <h3>Cancellation Details:</h3>
                    <ul>
                        <li>Order Amount: ₹${order.totalAmount}</li>
                        <li>Cancellation Date: ${new Date().toLocaleDateString()}</li>
                    </ul>
                    ${order.paymentType === 'prepaid' ? 
                        '<p><strong>Your refund will be initiated within 5-7 business days.</strong></p>' : 
                        ''}
                `
            );

            return res.status(200).json({
                success: true,
                message: 'Order cancelled successfully',
                order,
                shiprocketResponse
            });

        } catch (shiprocketError) {
            console.error('Shiprocket cancellation failed:', {
                orderId,
                shiprocketOrderId: order.shiprocket_order_id,
                error: shiprocketError.message
            });

            Object.assign(order, {
                orderStatus: 'Cancelled',
                cancellationDate: new Date(),
                cancellationNotes: 'Order cancelled in system but Shiprocket cancellation failed',
                shiprocketError: shiprocketError.message
            });
            await order.save();

            return res.status(200).json({
                success: true,
                message: 'Order cancelled in system but shipping cancellation may require manual intervention',
                order,
                shiprocketError: shiprocketError.message
            });
        }

    } catch (error) {
        console.error('Error in order cancellation:', {
            orderId,
            error: error.message
        });

        return res.status(500).json({
            success: false,
            message: 'Failed to cancel order',
            error: error.message
        });
    }
};

// delivery mail

exports.markOrderAsDelivered = async (req, res) => {
    const { orderId } = req.params;

    try {
        // Find the order by ID
        const order = await Order.findById(orderId);

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        if (order.orderStatus === 'Delivered') {
            return res.status(400).json({
                success: false,
                message: 'Order is already marked as delivered'
            });
        }

        // Update the order status to 'Delivered'
        order.orderStatus = 'Delivered';
        order.deliveryDate = new Date();
        await order.save();

        // Send delivery success email
        const orderItemsHtml = order.orderItems.map(item => `
            <li>
                <strong>${item.productName}</strong> - ${item.quantity} x ₹${item.price} = ₹${item.quantity * item.price}
                <br>Size: ${item.size}, Color: ${item.color}
            </li>
        `).join('');

        await sendEmail(
            order.email,
            'Order Delivered Successfully',
            `Your order #${order.orderId} has been delivered successfully.`,
            `
                <p>Dear Customer,</p>
                <p>We are pleased to inform you that your order <strong>#${order.orderId}</strong> has been delivered successfully.</p>
                <p><strong>Order Details:</strong></p>
                <ul>${orderItemsHtml}</ul>
                <p><strong>Total Amount:</strong> ₹${order.totalAmount}</p>
                <p>Thank you for shopping with us! We hope you enjoy your purchase.</p>
                <p>If you have any questions, feel free to contact us.</p>
            `
        );

        return res.status(200).json({
            success: true,
            message: 'Order marked as delivered and email sent to the customer',
            order
        });

    } catch (error) {
        console.error('Error marking order as delivered:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to mark order as delivered',
            error: error.message
        });
    }
};

//delete order by orderId
exports.deleteOrderById = async (req, res) => {
    try {
        const { orderId } = req.params;
        await Order.findByIdAndDelete(orderId);
        res.status(200).json({
            success: true,
            message: 'Order deleted successfully',
        });
    } catch (error) {
        console.error('Error in deleting order:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete order',
            error: error.message
        });
    }
};
const Product = require('../models/productModel');

const updateStock = async (order) => {
    try {
        for (const item of order.orderItems) {
            console.log("Processing item:", item);

            const product = await Product.findById(item.productId);
            if (product) {
                // Locate the size object
                const sizeObj = product.sizes.find(s => s.size === item.size);
                if (!sizeObj) {
                    console.log(`Size ${item.size} not found for product ${item.productId}`);
                    continue; // Skip this item if size is not found
                }

                // Locate the color object within the size
                const colorObj = sizeObj.colors.find(c => c.color === item.color);
                if (!colorObj) {
                    console.log(`Color ${item.color} not found in size ${item.size} for product ${item.productId}`);
                    continue; // Skip if color is not found
                }

                // Check if there is enough stock and then reduce it
                console.log(`Current stock for ${item.color}, size ${item.size}: ${colorObj.stock}`);
                if (colorObj.stock >= item.quantity) {
                    colorObj.stock -= item.quantity;
                    product.totalStock -= item.quantity;
                    console.log(`Updated stock for ${item.color}, size ${item.size}: ${colorObj.stock}`);
                } else {
                    throw new Error(`Insufficient stock for ${item.productName} in color ${item.color}, size ${item.size}`);
                }

                // Save the updated product
                await product.save();
                console.log(`Product ${item.productId} saved with updated stock`);
            } else {
                console.log(`Product with ID ${item.productId} not found`);
            }
        }
    } catch (error) {
        console.error("Error updating stock:", error.message);
        throw new Error("Failed to update stock");
    }
};

module.exports = {
    updateStock
}
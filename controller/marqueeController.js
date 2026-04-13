const Marquee = require('../models/marqueeModel');

// ── Default seed items shown until admin adds their own ────────────────────────
const DEFAULTS = [
    { text: 'Free Shipping on Orders ₹999+', icon: '✦', order: 0 },
    { text: 'Secure & Easy Returns',          icon: '✦', order: 1 },
    { text: 'New Drops Every Week',           icon: '✦', order: 2 },
];

// GET /api/get-marquee  (public — client fetches this)
exports.getMarquee = async (req, res) => {
    try {
        let items = await Marquee.find({ isActive: true }).sort({ order: 1, createdAt: 1 });

        // Auto-seed defaults on first call if collection is empty
        if (items.length === 0) {
            await Marquee.insertMany(DEFAULTS);
            items = await Marquee.find({ isActive: true }).sort({ order: 1 });
        }

        res.status(200).json({ success: true, items });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Failed to fetch marquee items', error: err.message });
    }
};

// GET /api/get-marquee-all  (admin — includes inactive items)
exports.getAllMarquee = async (req, res) => {
    try {
        const items = await Marquee.find().sort({ order: 1, createdAt: 1 });
        res.status(200).json({ success: true, items });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Failed to fetch marquee items', error: err.message });
    }
};

// POST /api/add-marquee  (admin)
exports.addMarquee = async (req, res) => {
    try {
        const { text, icon, isActive, order } = req.body;
        if (!text || !text.trim()) {
            return res.status(400).json({ success: false, message: 'text is required' });
        }
        const item = await Marquee.create({
            text: text.trim(),
            icon: icon || '✦',
            isActive: isActive !== undefined ? isActive : true,
            order: order || 0,
        });
        res.status(201).json({ success: true, message: 'Marquee item added', item });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Failed to add marquee item', error: err.message });
    }
};

// PUT /api/update-marquee/:id  (admin)
exports.updateMarquee = async (req, res) => {
    try {
        const { text, icon, isActive, order } = req.body;
        const item = await Marquee.findByIdAndUpdate(
            req.params.id,
            { text, icon, isActive, order },
            { new: true, runValidators: true }
        );
        if (!item) return res.status(404).json({ success: false, message: 'Item not found' });
        res.status(200).json({ success: true, message: 'Marquee item updated', item });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Failed to update marquee item', error: err.message });
    }
};

// DELETE /api/delete-marquee/:id  (admin)
exports.deleteMarquee = async (req, res) => {
    try {
        const item = await Marquee.findByIdAndDelete(req.params.id);
        if (!item) return res.status(404).json({ success: false, message: 'Item not found' });
        res.status(200).json({ success: true, message: 'Marquee item deleted' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Failed to delete marquee item', error: err.message });
    }
};

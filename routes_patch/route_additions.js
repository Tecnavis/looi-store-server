// ─────────────────────────────────────────────────────────────────────────────
// ADD THESE LINES to looi-store-server/Routes/route.js
// ─────────────────────────────────────────────────────────────────────────────

// 1) Near the top, with the other require() calls:
const marqueeController = require('../controller/marqueeController');

// 2) After the banner routes block (around line 66), add:
// Marquee / promo ticker
router.get('/get-marquee',      marqueeController.getMarquee);        // public — client
router.get('/get-marquee-all',  jwtMiddleware, marqueeController.getAllMarquee);  // admin
router.post('/add-marquee',     jwtMiddleware, marqueeController.addMarquee);
router.put('/update-marquee/:id',  jwtMiddleware, marqueeController.updateMarquee);
router.delete('/delete-marquee/:id', jwtMiddleware, marqueeController.deleteMarquee);

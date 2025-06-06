const app = require('express');
const router = app.Router();

router.get('/', (req, res) => {
    res.json({ message: 'api is working' });
});

module.exports = router;
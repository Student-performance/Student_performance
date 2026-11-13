const mutler = require('multer');
const storage = mutler.memoryStorage();
const upload = mutler({
    storage: storage,
    limits: {
        fileSize: 1024 * 1024, // 1 MB 
    }
})

module.exports = upload;
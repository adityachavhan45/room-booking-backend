const ipBlockList = new Map();

const checkForMaliciousContent = (content) => {
    // Check for common XSS patterns
    const maliciousPatterns = [
        /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
        /javascript:/gi,
        /on\w+\s*=/gi,
        /data:\s*text\/html/gi
    ];
    return maliciousPatterns.some(pattern => pattern.test(content));
};

const ipBlockMiddleware = (req, res, next) => {
    const clientIP = req.ip || req.connection.remoteAddress;
    const currentTime = Date.now();

    // Check if IP is blocked
    if (ipBlockList.has(clientIP)) {
        const blockData = ipBlockList.get(clientIP);
        const timeRemaining = blockData.blockUntil - currentTime;

        if (timeRemaining > 0) {
            // IP is still blocked
            return res.status(403).json({
                message: `Access denied. Please try again in ${Math.ceil(timeRemaining / 1000 / 60)} minutes.`
            });
        } else {
            // Block period expired, remove from blocklist
            ipBlockList.delete(clientIP);
        }
    }

    // Check request body for malicious content
    const requestBody = JSON.stringify(req.body);
    if (checkForMaliciousContent(requestBody)) {
        // Block IP for 10 minutes
        ipBlockList.set(clientIP, {
            blockUntil: currentTime + (10 * 60 * 1000), // 10 minutes
            attempts: 1
        });

        return res.status(403).json({
            message: 'Suspicious activity detected. Your IP has been blocked for 10 minutes.'
        });
    }

    next();
};

// Clean up expired blocks periodically
setInterval(() => {
    const currentTime = Date.now();
    for (const [ip, blockData] of ipBlockList.entries()) {
        if (blockData.blockUntil <= currentTime) {
            ipBlockList.delete(ip);
        }
    }
}, 60000); // Clean up every minute

module.exports = ipBlockMiddleware;

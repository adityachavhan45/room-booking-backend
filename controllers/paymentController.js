const Razorpay = require('razorpay');
const Booking = require('../models/Booking');

const razorpay = new Razorpay({
    key_id: 'rzp_test_GIWuqweMSnoaxQ',
    key_secret: 'MrcQ643oVfc1rvuCRBDVxfZi'
});

exports.createOrder = async (req, res) => {
    try {
        const { amount, bookingDetails } = req.body;
        console.log('Creating order with amount:', amount, 'bookingDetails:', bookingDetails);

        const options = {
            amount: amount * 100, // Razorpay expects amount in paise
            currency: 'INR',
            receipt: `booking_${Date.now()}`,
            payment_capture: 1, // Auto capture payment
            notes: {
                roomId: bookingDetails.roomId,
                roomName: bookingDetails.roomName,
                checkIn: bookingDetails.checkIn,
                checkOut: bookingDetails.checkOut,
                adults: bookingDetails.adults,
                children: bookingDetails.children,
                userId: req.user._id // Add user ID from auth middleware
            }
        };
        console.log('Razorpay order options:', options);

        const order = await razorpay.orders.create(options);
        console.log('Razorpay order created:', order);

        // Store order details for verification
        const orderData = {
            orderId: order.id,
            amount: order.amount,
            currency: order.currency,
            receipt: order.receipt,
            bookingDetails
        };

        res.json({
            success: true,
            order: orderData
        });
    } catch (error) {
        console.error('Error creating order:', error);
        console.error('Error details:', error.response ? error.response.data : error.message);
        res.status(500).json({
            success: false,
            message: 'Error creating payment order',
            error: error.message
        });
    }
};

exports.verifyPayment = async (req, res) => {
    try {
        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
            bookingDetails
        } = req.body;

        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !bookingDetails) {
            return res.status(400).json({
                success: false,
                message: 'Missing required payment details'
            });
        }
        
        console.log('Verifying payment with:', {
            orderId: razorpay_order_id,
            paymentId: razorpay_payment_id,
            signature: razorpay_signature,
            bookingDetails
        });

        // Verify payment signature
        const crypto = require('crypto');
        const sign = razorpay_order_id + "|" + razorpay_payment_id;
        const generated_signature = crypto
            .createHmac('sha256', razorpay.key_secret)
            .update(sign.toString())
            .digest('hex');

        if (generated_signature !== razorpay_signature) {
            return res.status(400).json({
                success: false,
                message: 'Invalid payment signature'
            });
        }

        // Fetch payment details from Razorpay
        const payment = await razorpay.payments.fetch(razorpay_payment_id);
        
        // Verify payment amount and status
        if (payment.status !== 'captured' && payment.status !== 'authorized') {
            return res.status(400).json({
                success: false,
                message: `Invalid payment status: ${payment.status}`
            });
        }

        // Capture the payment if not already captured
        if (payment.status === 'authorized') {
            try {
                await razorpay.payments.capture(razorpay_payment_id, payment.amount);
            } catch (captureError) {
                console.error('Payment capture failed:', captureError);
                return res.status(500).json({
                    success: false,
                    message: 'Failed to capture payment'
                });
            }
        }

        // Create booking after successful payment
        const booking = new Booking({
            roomId: bookingDetails.roomId,
            roomName: bookingDetails.roomName,
            checkIn: bookingDetails.checkIn,
            checkOut: bookingDetails.checkOut,
            adults: bookingDetails.adults,
            children: bookingDetails.children,
            userId: req.user._id,
            totalAmount: bookingDetails.totalAmount,
            paymentStatus: 'completed',
            paymentMethod: 'online',
            razorpayPaymentId: razorpay_payment_id,
            razorpayOrderId: razorpay_order_id,
            paymentAmount: payment.amount / 100, // Convert from paise to rupees
            paymentCurrency: payment.currency,
            createdAt: new Date()
        });

        try {
            await booking.save();
            console.log('Booking created successfully:', booking);

            return res.json({
                success: true,
                message: 'Payment verified and booking created successfully',
                booking,
                payment: {
                    id: payment.id,
                    amount: payment.amount / 100,
                    status: 'completed',
                    method: payment.method
                }
            });
        } catch (bookingError) {
            console.error('Booking creation failed:', bookingError);
            return res.status(500).json({
                success: false,
                message: 'Payment successful but booking creation failed'
            });
        }
    } catch (error) {
        console.error('Payment verification error:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Payment verification failed'
        });
    }
};

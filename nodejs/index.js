const express = require('express');
const bodyParser = require('body-parser');
const Pusher = require('pusher');

// Initialize Pusher with your app credentials
const pusher = new Pusher({
    appId: '1887957',       // Replace with your app ID
    key: 'ce53c66de28a8d6a9f9f',        // Replace with your app key
    secret: '06786adee4781b2dce7d',  // Replace with your app secret
    cluster: 'mt1', // Replace with your app cluster
    useTLS: true,
});

// Create an instance of an Express app
const app = express();
const port = process.env.PORT || 3000;

// Middleware to parse JSON request bodies
app.use(bodyParser.json());

// Function to check if a user is authorized to join a specific channel
const isUserAuthorizedToJoinChannel = (channel, userId) => {
    // Check if the channel matches the user-specific format
    return channel === `private-testapp-development-${userId}`;
};

// Authentication endpoint for Pusher private channels
app.post('/pusher/auth', (req, res) => {
    const socketId = req.body.socket_id;       // Socket ID sent by Pusher
    const channel = req.body.channel_name;     // Channel name to subscribe to
    const userId = req.body.userId;            // Retrieve the user ID from the request body

    // Check if the user is authorized to access the channel
    if (isUserAuthorizedToJoinChannel(channel, userId)) {
        const auth = pusher.authenticate(socketId, channel);
        res.send(auth); // Send the authentication response
    } else {
        res.status(403).send('Unauthorized'); // Respond with 403 if not authorized
    }
});
app.post('/trigger-event', (req, res) => {
    const { channel, event, data } = req.body;

    pusher.trigger(channel, event, data)
        .then(() => {
            res.status(200).send('Event triggered successfully');
        })
        .catch(error => {
            res.status(500).send(`Error triggering event: ${error.message}`);
        });
});

// Endpoint to initiate a call
app.post('/initiate-call', async (req, res) => {
    const { toUserId, fromUserId } = req.body;

    // Validate user IDs
    if (!toUserId || !fromUserId) {
        console.error('Missing user IDs in initiateCall.');
        return res.status(400).json({ error: 'Invalid user data.' });
    }

    // Dummy data for the user - replace with actual database call if necessary
    const userFirstName = 'John'; // Replace with `user.signup_firstname`
    const userLastName = 'Doe'; // Replace with `user.signup_lastname`

    // Prepare data for Pusher event
    const data = {
        from: fromUserId,
        to: toUserId,
        type: 'call_initiate',
        name: `${userFirstName} ${userLastName}`
    };
    const pusher = new Pusher({
        appId: '1887957',       // Replace with your app ID
        key: 'ce53c66de28a8d6a9f9f',        // Replace with your app key
        secret: '06786adee4781b2dce7d',  // Replace with your app secret
        cluster: 'mt1', // Replace with your app cluster
        useTLS: true,
    });
    try {
        // Triggering the Pusher event
        await pusher.trigger('video_call_channel', 'call_event', data);
        console.log('Call initiated successfully:', data);
        res.status(200).json({ status: 'success' });
    } catch (error) {
        console.error('Pusher error:', error.message);
        res.status(500).json({ error: 'Failed to initiate call' });
    }
});


// Start the Express server
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});

import React, { useEffect, useRef, useState } from 'react';
import { Linking, View, Button, StyleSheet, Alert, Text, TextInput, TouchableOpacity, Image } from 'react-native';
import { RTCView, mediaDevices } from 'react-native-webrtc';
import Pusher from 'pusher-js';
import { PermissionsAndroid } from 'react-native';
import Peer from 'peerjs';

async function requestCameraPermission() {
    const cameraGranted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.CAMERA,
        {
            title: 'Camera Permission',
            message: 'This app needs access to your camera.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
        },
    );
    if (cameraGranted === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
        Alert.alert(
            'Permission Required',
            'Camera permission has been permanently denied. Please enable it in the app settings.',
            [
                {
                    text: 'Cancel',
                    style: 'cancel',
                },
                {
                    text: 'Open Settings',
                    onPress: () => Linking.openSettings(),
                },
            ]
        );
    } else if (cameraGranted === PermissionsAndroid.RESULTS.GRANTED) {
        console.log('Camera permission granted.');
    } else {
        console.log('Camera permission denied.');
    }
}

const App = () => {
    const [localStream, setLocalStream] = useState(null);
    const [remoteStream, setRemoteStream] = useState(null);
    const [peerId, setPeerId] = useState('');
    const [peer, setPeer] = useState(null);
    const [userId, setUserId] = useState('user1');
    const [receiverId, setReieverId] = useState('');
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoHidden, setIsVideoHidden] = useState(false);

    useEffect(() => {
        requestCameraPermission();
        setReieverId('user2');
        const pusher = new Pusher('ce53c66de28a8d6a9f9f', {
            cluster: 'mt1',
            encrypted: true,
        });

        const channel = pusher.subscribe('video_call_channel');
        channel.bind('call_event', async (data) => {
            console.log('Received call event:', data);

            const newPeer = new Peer();
            setPeer(newPeer);

            const stream = await mediaDevices.getUserMedia({ video: true, audio: true });
            setLocalStream(stream);

            newPeer.on('call', (call) => {
                call.answer(stream);
                call.on('stream', (remoteStream) => {
                    setRemoteStream(remoteStream);
                });
            });

            newPeer.on('open', (id) => {
                setPeerId(id);
            });
        });

        return () => {
            channel.unbind_all();
            channel.unsubscribe();
            peer?.destroy();
        };
    }, []);

    const startCall = async () => {
        try {
        const newPeer = new Peer();
        setPeer(newPeer);
        const stream = await mediaDevices.getUserMedia({ video: true, audio: true });
        setLocalStream(stream);
        newPeer.on('open', async (id) => {
            setPeerId(id);
            try {
                await axios.post('http://127.22.224.1:3000/initiate-call', {
                    fromUserId: userId,
                    toUserId: receiverId,
                });
                console.log('Call initiated.');
            } catch (error) {
                console.error('Failed to initiate call:', error.message);
            }
        });

        newPeer.on('call', (call) => {
            call.answer(stream);
            call.on('stream', (remoteStream) => setRemoteStream(remoteStream));
        });
    }
    catch(ex){
        console.log(ex.message);
    }
    };
    const endCall = () => {
        if (localStream) {
            // Stop all tracks in the local stream
            localStream.getTracks().forEach(track => track.stop());
            setLocalStream(null); // Clear the local stream state
        }
    
        if (peer) {
            peer.destroy(); // Destroy the peer connection
            setPeer(null); // Clear the peer state
        }
    
        setRemoteStream(null); // Clear the remote stream state
        console.log('Call ended.');
    };
    const toggleMute = () => {
        if (localStream) {
            localStream.getAudioTracks().forEach(track => {
                track.enabled = !track.enabled; // Toggle audio track
            });
            setIsMuted(prev => !prev); // Update mute state
        }
    };

    const toggleVideo = () => {
        if (localStream) {
            localStream.getVideoTracks().forEach(track => {
                track.enabled = !track.enabled; // Toggle video track
            });
            setIsVideoHidden(prev => !prev); // Update video hide state
            console.log('isVideoHidden ' + isVideoHidden);
        }
    };
    return (
        <View style={styles.container}>
            <View style={styles.inputContainer}>
                <Text>Enter User ID</Text>
                <TextInput
                    style={styles.input}
                    placeholder="User ID"
                    value={userId}
                    onChangeText={setUserId}
                />
            </View>
            <View style={styles.streamContainer}>
                {localStream && !isVideoHidden && (
                    <RTCView
                        streamURL={localStream.toURL()}
                        style={styles.localStream}
                    />
                )}
                {remoteStream && (
                    <RTCView
                        streamURL={remoteStream.toURL()}
                        style={styles.remoteStream}
                    />
                )}
            </View>
            {/* <View style={styles.buttonContainer}>
                <Button title="Start Call" onPress={startCall} />
                <Button title="End Call" onPress={endCall} />
                <Button title={isMuted ? "Unmute" : "Mute"} onPress={toggleMute} />
                <Button title={isVideoHidden ? "Show Video" : "Hide Video"} onPress={toggleVideo} />
            </View> */}
            <View style={styles.buttonContainer}>
                <TouchableOpacity onPress={startCall} style={styles.button}>
                    <Image source={require('./assets/start-call.png')} style={styles.buttonImage} />
                </TouchableOpacity>
                <TouchableOpacity onPress={endCall} style={styles.button}>
                    <Image source={require('./assets/end-call.png')} style={styles.buttonImage} />
                </TouchableOpacity>
                <TouchableOpacity onPress={toggleMute} style={styles.button}>
                    <Image source={isMuted ? require('./assets/unmute.png') : require('./assets/mute.png')} style={styles.buttonImage} />
                </TouchableOpacity>
                <TouchableOpacity onPress={toggleVideo} style={styles.button}>
                    <Image source={isVideoHidden ? require('./assets/hide-video.png') : require('./assets/show-video.png')} style={styles.buttonImage} />
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f0f0f0',
    },
    streamContainer: {
        flexDirection: 'row',
        width: '100%',
        justifyContent: 'space-around',
        backgroundColor: 'black',
    },
    localStream: {
        width: '100%',
        height: 400,
        backgroundColor: 'black',
    },
    remoteStream: {
        width: '100%',
        height: 400,
        backgroundColor: 'black',
    },
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        width: '80%',
        marginTop: 20,
    },
    inputContainer: {
        marginBottom: 20,
    },
    buttonImage: {
        width: 30,
        height: 30,
    },
    input: {
        borderWidth: 1,
        padding: 8,
        width: 200,
    },
});

export default App;
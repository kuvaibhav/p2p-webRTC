let APP_ID = "5d2a3abce4c743979e62d977d3ae87ae"

let token = null;
let uid = String(Math.floor(Math.random() * 10000))

let client;
let channel;

let localStream;
let remoteStrem;
let peerConnection;

//stun server from google
const servers = {
    iceServers: [
        {
            urls:['stun:stun3.l.google.com:19302', 'stun:stun4.l.google.com:19302']
        }
    ]
}

let init = async () => {
    client = await AgoraRTM.createInstance(APP_ID)
    await client.login({uid, token})

    channel = client.createChannel('main')
    await channel.join()

    channel.on('MemberJoined', handleUserJoined)

    client.on('MessageFromPeer', handleMessageFromPeer)
    localStream = await navigator.mediaDevices.getUserMedia({video:true, audio:false})
    document.getElementById('user-1').srcObject = localStream;

    
}

let handleMessageFromPeer = async (message, MemberId) => {
    message = JSON.parse(message.text);
    console.log('Message: ', message)
}

let handleUserJoined = async (MemberId) => {
    console.log('A new user joined : ', MemberId);
    //Once page loads create offer.
    createOffer(MemberId);
}

/**
 * When we load our page and wants other peer to join we need to create an offer. 
 * We also want to send this offer to the peer.
 */
let createOffer = async (MemberId) => {
    //1. First create a peer connection. This is the interface that will hold information between us and remote peer. Also provide methods to connect to peer. 
    peerConnection = new RTCPeerConnection(servers)

    //2. In the remoteStream we want to add it as media strem. This is the second user.
    remoteStrem = new MediaStream();
    //Once we have video stream incoming we can see it under the user-2 id tag in html.
    document.getElementById('user-2').srcObject = remoteStrem;

    //5. get the local video and audio track from user-1 system and add it to the peerconnection we established in step 1.
    localStream.getTracks().forEach((track) => {
        peerConnection.addTrack(track, localStream)
    })

    //6. So now we have tracks on peerConnection. We want to also listen tracks from remoteStream.
    peerConnection.ontrack = (event) => {
        //We are looping through every single tracks from remote peer. 
        event.streams[0].getTracks().forEach((track) => {
            //Add tracks listened to to remoteStream object.
            remoteStrem.addTrack(track)
        })
    }

    //7. Whenever we create offer we also have to create ice candidates.
    peerConnection.onicecandidate = async (event) => {
        //first check if we have a candidate. 
        if(event.candidate) {
            console.log('New ICE candidate: ', event.candidate)
        } else {
            console.log('Ice Candidate not found');
        }
    }


    //3. This is where we actually create an offer.
    let offer = await peerConnection.createOffer()
    //4. We set local description of user-1 in offer. Also when this is set it going to send requests to stun server which will create ice candidates.
    // This method will fire onicecandidate() method.
    await peerConnection.setLocalDescription(offer);

    //Here you can see how the offer of user 1 actually looks like.
    console.log('Offer: ', offer);

    client.sendMessageToPeer({text: JSON.stringify({'type': 'offer', 'offer': offer})}, MemberId)
}

init()
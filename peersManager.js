// Fallbacks for vendor-specific variables until the spec is finalized.
var PeerConnection = window.PeerConnection || window.webkitPeerConnection00 || window.mozRTCPeerConnection;

// Holds the STUN server to use for PeerConnections.
var STUN_SERVER = "STUN stun.l.google.com:19302";


function PeersManager(signaling, db)
{
    EventTarget.call(this)

    var peers = {}

    var self = this


    // Get the channel of one of the peers that have the file from its hash.
    // Since the hash and the tracker system are currently not implemented we'll
    // get just the channel of the peer where we got the file that we added
    // ad-hoc before
    function getChannel(file)
    {
        return file.channel
    }

    this._transferbegin = function(file)
    {
        // Calc number of necesary chunks to download
        var chunks = file.size/chunksize;
        if(chunks % 1 != 0)
            chunks = Math.floor(chunks) + 1;

        // Add a blob container and a bitmap to our file stub
        file.blob = new Blob([''], {"type": file.type})
        file.bitmap = Bitmap(chunks)

        // Insert new "file" inside IndexedDB
        db.sharepoints_add(file,
        function()
        {
            self.dispatchEvent({type: "transfer.begin", data: [file]})
            console.log("Transfer begin: '"+file.name+"' = "+JSON.stringify(file))

            // Demand data from the begining of the file
            getChannel(file).emit('transfer.query', file.socketId, file.name,
                                                    getRandom(file.bitmap))
        },
        function(errorCode)
        {
            console.error("Transfer begin: '"+file.name+"' is already in database.")
        })
    }

	function createPeerConnection(id)
	{
	    var pc = peers[id] = new PeerConnection(STUN_SERVER, function(){});

		return pc
	}

	function initDataChannel(pc, channel)
	{
        pc._channel = channel

        Transport_init(channel)

        Transport_Peer_init(channel, db, self)
        Transport_Host_init(channel, db)

		channel.onclose = function()
		{
   			delete pc._channel
		}
	}


    this.connectTo = function(uid, onsuccess, onerror)
    {
        // Search the peer between the list of currently connected peers
        var peer = peers[uid]

        // Peer is not connected, create a new channel
        if(!peer)
        {
            // Create PeerConnection
            peer = createPeerConnection(uid);
            peer.onopen = function()
            {
                var channel = peer.createDataChannel()
                channel.onopen = function()
                {
	                initDataChannel(peer, channel)

	                if(onsuccess)
	                    onsuccess(channel)
                }
            }
            peer.onerror = function()
            {
                if(onerror)
                    onerror()
            }

            // Send offer to new PeerConnection
            var offer = peer.createOffer();

            signaling.emit("offer", uid, offer.toSdp());

            peer.setLocalDescription(peer.SDP_OFFER, offer);
        }

        // Peer is connected and we have defined an 'onsucess' callback
        else if(onsuccess)
            onsuccess(peer._channel)
    }

    this.getPeer = function(socketId)
    {
        return peers[socketId]
    }

    this.createPeer = function(socketId)
    {
        var peer = createPeerConnection(socketId)
	        peer.ondatachannel = function(event)
	        {
                console.log("createPeer")
	            initDataChannel(peer, event.channel)
	        }

        return peer
    }
}
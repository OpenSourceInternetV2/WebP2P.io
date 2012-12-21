// Fallbacks for vendor-specific variables until the spec is finalized.
var RTCPeerConnection = window.RTCPeerConnection || window.webkitRTCPeerConnection || window.mozRTCPeerConnection;


/**
 * @classdesc Manager of the communications with the other peers
 * @constructor
 * @param {IDBDatabase} db ShareIt! database
 * @param {String} [stun_server="stun.l.google.com:19302"] URL of the server
 * used for the STUN communications
 */
function PeersManager(db, stun_server)
{
    // Set a default STUN server if none is specified
    if(stun_server == undefined)
		stun_server = "stun.l.google.com:19302";

    EventTarget.call(this)

    var peers = {}
    var signaling

    var self = this


    /**
     * Get the channel of one of the peers that have the file from its hash.
     * Since the hash and the tracker system are currently not implemented we'll
     * get just the channel of the peer where we got the file that we added
     * ad-hoc before
     * @param {Fileentry} Fileentry of the file to be downloaded
     * @returns {RTCDataChannel} Channel where we can ask for data of the file
     */
    function getChannel(fileentry)
    {
        return fileentry.channel
    }

    /**
     * Request (more) data for a file
     * @param {Fileentry} Fileentry of the file to be requested
     */
    this.transfer_query = function(fileentry)
    {
        var channel = getChannel(fileentry)
        var chunk = fileentry.bitmap.getRandom(false)

        channel.emit('transfer.query', fileentry.hash, chunk)
    }

    /**
     * Start the download of a file
     * @param {Fileentry} Fileentry of the file to be downloaded
     */
    this._transferbegin = function(fileentry)
    {
        // Calc number of necesary chunks to download
        var chunks = fileentry.size/chunksize;
        if(chunks % 1 != 0)
            chunks = Math.floor(chunks) + 1;

        // Add a blob container and a bitmap to our file stub
        fileentry.blob = new Blob([''], {"type": fileentry.type})
        fileentry.bitmap = new Bitmap(chunks)

        // Insert new "file" inside IndexedDB
        db.files_add(fileentry,
        function()
        {
            self.dispatchEvent({type: "transfer.begin", data: [fileentry]})

            // Demand data from the begining of the file
            self.transfer_query(fileentry)
        },
        function(errorCode)
        {
            console.error("Transfer begin: '"+fileentry.name+"' is already in database.")
        })
    }

    /**
     * Notify to all peers that I have added a new file (both by the user or
     * downloaded)
     * @param {Fileentry} Fileentry of the file that have been added
     */
    this._send_file_added = function(fileentry)
    {
        for(var uid in peers)
            peers[uid]._channel._send_file_added(fileentry);
    }

    /**
     * Notify to all peers that I have deleted a file (so it's not accesible)
     * @param {Fileentry} Fileentry of the file that have been deleted
     */
    this._send_file_deleted = function(fileentry)
    {
        for(var uid in peers)
            peers[uid]._channel._send_file_deleted(fileentry);
    }

    /**
     * Create a new RTCPeerConnection
     * @param {UUID} id Identifier of the other peer so later can be accessed
     * @returns {RTCPeerConnection}
     */
    function createPeerConnection(id)
	{
	    var pc = peers[id] = new RTCPeerConnection({"iceServers": [{"url": 'stun:'+stun_server}]});

		return pc
	}

    /**
     * Initialize a {RTCDataChannel}
     * @param {RTCPeerConnection} pc PeerConnection owner of the DataChannel
     * @param {RTCDataChannel} channel Communication channel with the other peer
     */
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

	/**
	 * Connects to another peer based on its UID. If we are already connected,
	 * it does nothing.
	 * @param {UUID} uid Identifier of the other peer to be connected
	 * @param {Function} onsuccess Callback called when the connection was done
	 * @param {Function} onerror Callback called when connection was not possible
	 */
    this.connectTo = function(uid, onsuccess, onerror)
    {
        // Search the peer between the list of currently connected peers
        var peer = peers[uid]

        // Peer is not connected, create a new channel
        if(!peer)
        {
            if(!signaling)
            {
                console.error("No signaling channel available")
                return
            }

            // Create PeerConnection
            peer = createPeerConnection(uid);
            peer.onopen = function()
            {
                var channel = peer.createDataChannel('webp2p')
                channel.onopen = function()
                {
	                initDataChannel(peer, channel)

	                if(onsuccess)
	                    onsuccess(channel)
                }
                channel.onerror = function()
                {
                    if(onerror)
                        onerror(uid, peer, channel)
                }
            }

            // Send offer to new PeerConnection
            peer.createOffer(function(offer)
            {
                signaling.sendOffer(uid, offer.sdp)

                peer.setLocalDescription(new RTCSessionDescription({sdp: offer.sdp,
                                                                   type: 'offer'}))
            });
        }

        // Peer is connected and we have defined an 'onsucess' callback
        else if(onsuccess)
            onsuccess(peer._channel)
    }

    /**
     * Get a peer from the peers list based on its UID
     * @param {UUID} uid Identifier of the other peer
     * @returns {RTCPeerConnection|undefined} The requested peer or undefined
     */
    this.getPeer = function(uid)
    {
        return peers[uid]
    }

    /**
     * Creates a new peer connection and initialize it
     * @param {UUID} uid Identifier of the other peer
     * @returns {RTCPeerConnection} The newly created and initialized peer
     */
    this.createPeer = function(uid)
    {
        var peer = createPeerConnection(uid)
	        peer.ondatachannel = function(event)
	        {
                console.log("createPeer")
	            initDataChannel(peer, event.channel)
	        }

        return peer
    }

    /**
     * Set the {SignalingManager} to be used
     * @param {SignalingManager} newSignaling The new {SignalingManager}
     */
    this.setSignaling = function(newSignaling)
    {
        signaling = newSignaling
    }
}
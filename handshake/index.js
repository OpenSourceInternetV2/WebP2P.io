/**
 * Remove leading 'falsy' items (null, undefined, '0', {}...) from an array
 * @param {Array} array {Array} where to remove the leading 'falsy' items
 * @returns {Array} The cleaned {Array}
 */
function removeLeadingFalsy(array)
{
    var end = array.length
    while(!array[end-1])
        end--
    return array.slice(0, end)
}

/**
 * Manage the handshake channel using several servers
 * @constructor
 * @param {String} json_uri URI of the handshake servers configuration
 */
function HandshakeManager(json_uri, peersManager)
{
    var self = this


    /**
     * UUID generator
     */
    var UUIDv4 = function b(a){return a?(a^Math.random()*16>>a/4).toString(16):([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g,b)}

    /**
     * Get a random handshake channel or test for the next one
     * @param {Object} configuration Handshake servers configuration
     */
    function getRandomHandshake(configuration)
    {
        if(!configuration.length)
        {
            if(self.onerror)
                self.onerror()
            return
        }

        var index = Math.floor(Math.random()*configuration.length)
        var index = 0   // Forced until redirection works

        var type = configuration[index][0]
        var conf = configuration[index][1]

        function onerror(error)
        {
            console.error(error)

            // Try to get an alternative handshake channel
            configuration.splice(index, 1)
            getRandomHandshake(configuration)
        }

        var channel
        switch(type)
        {
            case 'PubNub':
                conf.uuid = conf.uuid || UUIDv4()
                channel = new Handshake_PubNub(conf)
                break;

            case 'SimpleSignaling':
                conf.uid = conf.uid || UUIDv4()
                channel = new Handshake_SimpleSignaling(conf)
                break;

            default:
                onerror("Invalidad handshake server type '"+type+"'")
                return
        }

        channel.onopen = function(uid)
        {
            Transport_init(channel)
            Transport_Routing_init(channel, peersManager)

            // Count the maximum number of pending connections allowed to be
            // done with this handshake server (undefined == unlimited)
            channel.connections = 0
            channel.max_connections = conf.max_connections

            channel.presence = function()
            {
                channel.emit('presence', configuration.uuid)
            }

            channel.addEventListener('presence', function(event)
            {
                var uid = event.data[0]

                // Don't try to connect to ourselves
                if(uid != configuration.uuid)
                {
                    // Check if we should ignore this peer to increase entropy
                    // in the network mesh

                    // Do the connection with the new peer
                    peersManager.connectTo(uid, function()
                    {
                        // Increase the number of connections reached throught
                        // this handshake server
                        channel.connections++

                        // Close connection with handshake server if we got its
                        // quota of peers
                        if(channel.connections == channel.max_connections)
                           channel.close()
                    },
                    function(uid, peer, channel)
                    {
                        console.error(uid, peer, channel)
                    })
                }
            })

            // Notify our presence to the other peers on the handshake server
            channel.presence()

            if(self.onopen)
               self.onopen(uid)
        }
        channel.onclose = function()
        {
            configuration.splice(index, 1)
            getRandomHandshake(configuration)
        }
        channel.onerror = onerror
    }

    var http_request = new XMLHttpRequest();
        http_request.open("GET", json_uri);
        http_request.onload = function()
        {
            if(this.status == 200)
                getRandomHandshake(JSON.parse(http_request.response))

            else if(self.onerror)
                self.onerror()
        };
        http_request.onerror = function()
        {
            if(self.onerror)
                self.onerror()
        }
        http_request.send();


    /**
     * Send a RTCPeerConnection offer through the active handshake channel
     * @param {UUID} uid Identifier of the other peer
     * @param {String} sdp Content of the SDP object
     */
    this.sendOffer = function(uid, sdp)
    {
        if(handshake && handshake.send)
            handshake.send(uid, ["offer", sdp]);
        else
            console.warn("Handshake channel is not available");
    }

    /**
     * Send a RTCPeerConnection answer through the active handshake channel
     * @param {UUID} uid Identifier of the other peer
     * @param {String} sdp Content of the SDP object
     */
    this.sendAnswer = function(uid, sdp)
    {
        if(handshake)
            handshake.send(uid, ["answer", sdp]);
        else
            console.warn("Handshake channel is not available");
    }

    /**
     * Return the handshake server instance we are connected
     */
    this.handshake = function()
    {
        return handshake
    }

    this.close = function()
    {
        if(handshake)
            handshake.close();
    }
}
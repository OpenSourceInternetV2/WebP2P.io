/**
 * Manage the handshake channel using several servers
 * @constructor
 * @param {String} json_uri URI of the handshake servers configuration
 */
function HandshakeManager(json_uri)
{
    var self = this

    var handshake = null

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

        switch(type)
        {
            case 'PubNub':
                conf.uuid = conf.uuid || UUIDv4()
                handshake = new Handshake_PubNub(conf)
                break;

            case 'SimpleSignaling':
                conf.uid = conf.uid || UUIDv4()
                handshake = new Handshake_SimpleSignaling(conf)
                break;
        }

        handshake.onopen = function(uid)
        {
            handshake.onmessage = function(uid, data)
            {
                switch(data[0])
                {
                    case 'offer':
                        if(self.onoffer)
                            self.onoffer(uid, data[1])
                        break

                    case 'answer':
                        if(self.onanswer)
                            self.onanswer(uid, data[1])
                }
            }

            if(self.onopen)
               self.onopen(uid)
        }
        handshake.onerror = function(error)
        {
            console.error(error)

            // Try to get an alternative handshake channel
            configuration.splice(index, 1)
            getRandomHandshake(configuration)
        }
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
}
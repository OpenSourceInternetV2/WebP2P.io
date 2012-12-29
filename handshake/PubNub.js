webp2p.require("https://raw.github.com/pubnub/pubnub-api/master/javascript/3.3.1/pubnub-3.3.1.js")

/**
 * Handshake channel connector for PubNub
 * @param {Object} configuration Configuration object
 */
function Handshake_PubNub(configuration)
{
    var self = this

    // Connect a handshake channel to the PubNub server
    var pubnub = PUBNUB.init(configuration);
        pubnub.subscribe(
        {
            channel: configuration.channel,

            // Receive messages
            callback: function(message)
            {
                var uid  = message[0]
                var dest = message[1]

                // Only launch callback if message is not from ours
                // and it's a broadcast or send directly to us
                if( uid  != configuration.uuid
                &&(!dest || dest == configuration.uuid))
                {
                    var data = message[2]

                    if(self.onmessage)
                        self.onmessage(uid, data)
                }
            },

            connect: function()
            {
                // Compose and send message
                self.send = function(dest, data)
                {
                    var message = [configuration.uuid, dest, data]

                    pubnub.publish(
                    {
                        channel: configuration.channel,

                        message: removeLeadingFalsy(message)
                    })
                }

                // Set handshake as open
                if(self.onopen)
                    self.onopen(configuration.uuid)
            },

            error: function(error)
            {
                if(self.onerror)
                    self.onerror(error)
            }
        })

    this.close = function()
    {
        pubnub.unsubscribe(
        {
            channel: configuration.channel
        });
    }
}
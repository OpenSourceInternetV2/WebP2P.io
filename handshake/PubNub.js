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
                var dest = message[1]

                if(!dest || dest == configuration.uuid)
                {
                    var uid  = message[0]
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
}
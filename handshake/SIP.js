/**
 * Signaling channel connector for SIP
 * @param {Object} configuration Configuration object
 */
function Signaling_SIP(configuration)
{
    var self = this

    // Connect a signaling channel to the SIP server
    var signaling = new JsSIP.UA(configuration);
        signaling.on('registered', function()
        {
            // Compose and send message
            self.send = function(uid, data)
            {
                signaling.sendMessage(uid, JSON.stringify(data), 'text/JSON',
                                      {failed: function(response, error)
                                               {
                                                   console.warn(response);
                                                   console.warn(error);

                                                   if(self.onerror)
                                                       self.onerror(error)
                                               }
                                      })
            }

            signaling.on('newMessage', function(event)
            {
                var uid  = event.data.message.remote_identity
                var data = JSON.parse(event.data.message.body)

                if(self.onmessage)
                    self.onmessage(uid, data)
            })

            // Set signaling as open
            if(self.onopen)
                self.onopen(configuration.uri)
        });
        signaling.on('registrationFailed', function(error)
        {
            if(self.onerror)
                self.onerror(error)
        });

    // Start the SIP connection
    signaling.start();
}
var webp2p = (function(module){
var _priv = module._priv = module._priv || {}

/**
 * Handshake channel connector for SimpleSignaling
 * @param {Object} configuration Configuration object.
 */
_priv.HandshakeManager.registerConstructor('SimpleSignaling',
function(configuration)
{
  _priv.Transport_init(this);

  this.isPubsub = true;

  var self = this;

  // Connect a handshake channel to the SimpleSignaling server
  var connection = new SimpleSignaling(configuration);


  /**
   * Receive messages
   */
  connection.onmessage = function(uid, data)
  {
    if(self.onmessage)
       self.onmessage(uid, data);
  };


  /**
   * Handle the presence of other new peers
   */
  this.addEventListener('presence', function(event)
  {
    var uid = event.data[0];
  
    // Don't try to connect to ourselves
    if(uid != configuration.uid)
    {
      var event = document.createEvent("Event");
          event.initEvent('presence',true,true);
          event.uid = uid

      self.dispatchEvent(event);
    }
  });


  connection.onopen = function(uid)
  {
    // Notify our presence
    self.emit('presence', peersManager.uid);

    // Notify that the connection to this handshake server is open
    if(self.onopen)
       self.onopen(uid);
  };


  /**
   * Handle errors on the connection
   */
  connection.onerror = function(error)
  {
    if(self.onerror)
       self.onerror(error);
  };


  /**
   * Send a message to a peer
   */
  function send(data, uid)
  {
    data.from = configuration.uid
    if(uid)
      data.to = uid

    connection.send(JSON.stringify(data));
  }


  /**
   * Close the connection with this handshake server
   */
  this.close = function()
  {
    connection.close()
  }


  /**
   * Send a RTCPeerConnection answer through the active handshake channel
   * @param {UUID} uid Identifier of the other peer.
   * @param {String} sdp Content of the SDP object.
   * @param {Array} [route] Route path where this answer have circulated.
   */
  this.sendAnswer = function(orig, sdp, route)
  {
    var data = {type: 'answer',
                sdp:  sdp,
                route: route}

//    // Run over all the route peers looking for possible "shortcuts"
//    for(var i = 0, uid; uid = route[i]; i++)
//      if(uid == transport.uid)
//      {
//        route.length = i;
//        break;
//      }

    send(data, orig);
  };


  /**
   * Send a RTCPeerConnection offer through the active handshake channel
   * @param {UUID} uid Identifier of the other peer.
   * @param {String} sdp Content of the SDP object.
   * @param {Array} [route] Route path where this offer have circulated.
   */
  this.sendOffer = function(dest, sdp, route)
  {
    var data = {type: 'offer',
                sdp:  sdp}
    if(route)
      data.route = route;

    send(data, dest);
  };
})

return module
})(webp2p || {})
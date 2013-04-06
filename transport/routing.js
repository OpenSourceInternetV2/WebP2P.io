var webp2p = (function(module){
var _priv = module._priv = module._priv || {}

_priv.Transport_Routing_init = function(transport, peersManager)
{
  /**
   * Receive and process an 'offer' message
   */
  transport.addEventListener('offer', function(event)
  {
    var from  = event.from;
    var sdp   = event.sdp;
    var route = event.route;

//    // If a message have been already routed by this peer, ignore it
//    for(var i = 0, uid; uid = route[i]; i++)
//      if(uid == peersManager.uid)
//        return;

//    // Offer is for us
//    if(dest == peersManager.uid)
//    {

      // Create PeerConnection
      var pc = transport.onoffer(from, sdp);

      // Send answer
      pc.createAnswer(function(answer)
      {
        transport.sendAnswer(from, answer.sdp, route);

        pc.setLocalDescription(new RTCSessionDescription(
        {
          sdp: answer.sdp,
          type: 'answer'
        }));
      });

//    }
//
//    // Offer is not for us, route it over the other connected peers
//    else
//    {
//      // Add the transport where it was received to the route path
//      route.push(transport.uid);
//
//      // Search the peer between the list of currently connected peers
//      var channels = peersManager.getChannels();
//      var channel = channels[dest];
//
//      // Requested peer is one of the connected, notify directly to it
//      if(channel)
//         channel.sendOffer(from, sdp, route);
//
//      // Requested peer is not one of the directly connected, broadcast it
//      else for(var uid in channels)
//      {
//        // Ignore peers already on the route path
//        var routed = false;
//        for(var i = 0, peer; peer = route[i]; i++)
//          if(peer == uid)
//          {
//            routed = true;
//            break;
//          }
//
//          // Notify the offer request to the other connected peers
//          if(!routed)
//            channels[uid].sendOffer(dest, sdp, route);
//      }
//    }
  });

  /**
   * Receive and process an 'answer' message
   */
  transport.addEventListener('answer', function(event)
  {
    var from = event.from;
    var sdp = event.sdp;
    var route = event.route;

//    // Answer is from ourselves or we don't know where it goes, ignore it
//    if(orig == peersManager.uid
//    || !route.length)
//      return;
//
//    // Answer is for us
//    if(route[0] == peersManager.uid)
      transport.onanswer(from, sdp);

//    // Answer is not for us but we know where it goes, search peers on route
//    // where we could send it
//    else if(route.length > 1)
//    {
//      var routed = false;
//
//      var channels = peersManager.getChannels();
//
//      // Run over all the route peers looking for possible "shortcuts"
//      for(var i = 0, uid; uid = route[i]; i++)
//      {
//        var channel = channels[uid];
//        if(channel)
//        {
//          channel.sendAnswer(from, sdp, route.slice(0, i - 1));
//
//          // Currently is sending the message to all the shortcuts, but maybe it
//          // would be necessary only the first one so some band-width could be
//          // saved?
//          routed = true;
//        }
//      }
//
//      // Answer couldn't be routed (maybe a peer was disconnected?), try to find
//      // the connection request initiator peer by broadcast
//      if(!routed)
//        for(var uid in channels)
//          if(uid != transport.uid)
//            channels[uid].sendAnswer(orig, sdp, route);
//    }
  });


  transport.onoffer = function(from, sdp)
  {
    return peersManager.onoffer(from, sdp, function(uid, event)
    {
      console.error('Error creating DataChannel with peer ' + uid);
      console.error(event);
    });
  };
  transport.onanswer = function(from, sdp)
  {
    peersManager.onanswer(from, sdp, function(uid)
    {
      console.error("[routing.answer] PeerConnection '" + uid + "' not found");
    });
  };
}

return module
})(webp2p || {})
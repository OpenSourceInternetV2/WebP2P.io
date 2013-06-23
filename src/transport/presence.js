function Transport_Presence_init(transport, peersManager, max_connections)
{
  Transport_Routing_init(transport, peersManager);

  // Count the maximum number of pending connections allowed to be
  // done with this handshake server (undefined == unlimited)
  transport.connections = 0
  transport.max_connections = max_connections

  /**
   * Handle the presence of other new peers
   */
  transport.addEventListener('presence', function(event)
  {
    var from = event.from;

    // Check if we should ignore this new peer to increase entropy in
    // the network mesh

    // Do the connection with the new peer
    peersManager.connectTo(from, ['shareit'], transport, function(error)
    {
      if(error)
        console.error(from, peer, transport);

      else
        // Increase the number of connections reached throught
        // this handshake server
        transport.connections++;

      // Close connection with handshake server if we got its
      // quota of peers
      if(transport.connections == transport.max_connections)
        transport.close();
    });
  })

  transport.onerror = function(error)
  {
    console.error(error);

    // Close the channel (and try with the next one)
    transport.close();
  };
}
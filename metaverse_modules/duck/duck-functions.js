
import interfaceFactory from '@psychedelic/dab-js/dist/idls/dip_721_v2.did.js';

export const plugLogin = async () => {
    const canisterId = "6hgw2-nyaaa-aaaai-abkqq-cai";
    const whitelist = [canisterId];
    const standard = "DIP721v2";
    console.log('logging in...');
    await window.ic.plug.requestConnect({whitelist});
    console.log("Plug has logged in, grabbing actor...");
    const principal = await window.ic.plug.agent.getPrincipal();
    console.log("Your principal is " + principal);;
    const connected = await window.ic.plug.isConnected();
    if (connected) {
      console.log("You have been logged in with plug.");
    } else {
      console.log("Please try again.");
    }
    const actor = await window.ic.plug.createActor({canisterId, interfaceFactory});
    console.log(actor);
    // console.log("Actor created successfully, getting token supply...");
    // console.log(newPlugActor);
    // const result = await newPlugActor.totalSupply();
    // alert(result);
  }
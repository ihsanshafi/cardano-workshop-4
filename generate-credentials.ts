import * as fs from "fs";
import * as path from "path";
import { Cardano } from "@emurgo/cardano-serialization-lib-nodejs";

async function generateCredentials() {
  try {
    // Generate a new key pair
    const keyPair = Cardano.PrivateKey.generate_ed25519();
    const privateKey = keyPair.to_bech32();
    const publicKey = keyPair.to_public().to_bech32();

    // Generate address
    const networkId = Cardano.NetworkId.testnet();
    const address = Cardano.BaseAddress.new(
      networkId,
      Cardano.StakeCredential.from_keyhash(
        Cardano.PrivateKey.from_bech32(privateKey).to_public().hash()
      ),
      Cardano.StakeCredential.from_keyhash(
        Cardano.PrivateKey.from_bech32(privateKey).to_public().hash()
      )
    )
      .to_address()
      .to_bech32();

    // Save credentials
    fs.writeFileSync("me.sk", privateKey);
    fs.writeFileSync("me.addr", address);

    console.log("Credentials generated successfully!");
    console.log("Address:", address);
  } catch (error) {
    console.error("Error generating credentials:", error);
  }
}

generateCredentials();

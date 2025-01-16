const { Ed25519Keypair } = require("@mysten/sui/keypairs/ed25519");
const config = require("../config");

exports.createSigner = (mnemonic) => {

	if (!mnemonic) {
		throw new Error("Mnemonics Not Found");
	}

	return Ed25519Keypair.deriveKeypair(mnemonic)
}

exports.createSignerWithSecretKey = (secret) => {

	if (!secret) {
		throw new Error("Secret Not Found");
	}

	return Ed25519Keypair.fromSecretKey(secret);
}

exports.createWallets = (numberOfWallets) => {
	let finalWalletPairs = [];
	for(let i = 0; i < numberOfWallets; i++) {
		const keypair = new Ed25519Keypair();
		
		// console.log("PrivateKey: ", keypair.getSecretKey());
		// console.log(keypair.getPublicKey().toSuiAddress());
		// console.log(Ed25519Keypair.fromSecretKey(keypair.getSecretKey()).getPublicKey().toSuiAddress())
		finalWalletPairs.push({
			privateKey: keypair.getSecretKey(),
			publicKey: keypair.getPublicKey().toSuiAddress(),
			isActive: true
		});
	}
	return finalWalletPairs;
}

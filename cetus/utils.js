const { SuiClient, getFullnodeUrl } = require("@mysten/sui/client");
const { Transaction, coinWithBalance } = require("@mysten/sui/transactions");
const config = require("../config");
const { createSigner, createSignerWithSecretKey } = require("./keypair");

const suiClient = new SuiClient({ url: getFullnodeUrl('mainnet') });


exports.getBalance = async (address, token) => {
    const balance = await suiClient.getBalance({
        owner: address,
        coinType: token
    });
    return balance?.totalBalance;
}

exports.transfer = async (fromAddress, toAddress, tokenAddress, amount, signer) => {
    console.log("[transfer]");
    // let signer;
    // if (fromAddress === config.baseAddress) {
    //     signer = createSigner(config.baseMnemonic)
    // }

    const tx = new Transaction();

    tx.setSender(fromAddress);
    const suiCoin = coinWithBalance({ balance: amount });
    tx.transferObjects([suiCoin], toAddress);
    const res1 = await suiClient.signAndExecuteTransaction({
        transaction: tx,
        signer: signer
    })
    await suiClient.waitForTransaction({ digest: res1?.digest });

    return res1?.digest;

    return;
    // if (tokenAddress === config.suiTokenAddress) {
    //     const [coin] = tx.splitCoins(tx.gas, [amount]);
    //     tx.transferObjects([coin], toAddress);
    // } else {
    // const [coin] = tx.splitCoins("0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7", [amount]);
    const coins = await suiClient.getCoins({
        owner: fromAddress,
        coinType: tokenAddress
    });
    console.log(coins);
    // return
    const sufficientCoins = coins.data.filter(coin => BigInt(coin.balance) >= BigInt(amount));
    console.log(sufficientCoins)
    if (sufficientCoins.length > 0) {
        const [splitCoin] = tx.splitCoins(tokenAddress === config?.suiTokenAddress ? tx.gas : tx.object(sufficientCoins[0].coinObjectId), [amount]);
        tx.transferObjects([splitCoin], toAddress);
    } else {
        let requiredAmount = BigInt(amount);
        let collectedCoins = [];
        let totalBalance = BigInt(0);
        for (let coin of coins.data) {
            collectedCoins.push(tx.object(coin.coinObjectId));
            totalBalance += BigInt(coin.balance);
            if (totalBalance >= requiredAmount) break;
        }
        if (totalBalance < requiredAmount) {
            throw new Error("Insufficient balance to complete the transfer.");
        }

        // tx.mergeCoins(collectedCoins[0], [collectedCoins[1]]);
        // const [splitCoin] = tx.splitCoins(tx.gas, [85569313]);
        // if(tokenAddress === config?.suiTokenAddress) {
        //     mergedCoin = tx.mergeCoins(tx.gas, collectedCoins);
        // } else {
        //     mergedCoin = tx.mergeCoins(collectedCoins[0], collectedCoins.slice(1));
        // }


        // const mergedCoin = tx.mergeCoins(collectedCoins[0], collectedCoins.slice(1));

        // tx.transferObjects([mergedCoin], toAddress);
        // }




        // const [splitCoin] = tx.splitCoins(tx.gas, ['1000']);
        // tx.transferObjects([splitCoin], toAddress);
    }
    console.log("Executing")
    // console.log(tx)
    const res = await suiClient.signAndExecuteTransaction({
        transaction: tx,
        signer: signer
    })
    console.log(res);
    console.log("Confirming");
    await suiClient.waitForTransaction({ digest: res.digest });
    return res?.digest;

}

exports.batchTransferWithSameFromAddress = async (toAccounts, fromAddress, tokenAddress, amount, fromAddressPrivateKey) => {
    console.log("[batchTransfer]");
    if (toAccounts.length <= 0) {
        throw new Error("At least one recipient is required.");
    }
    let signer = createSignerWithSecretKey(fromAddressPrivateKey);
    // if (fromAddress === config?.baseAddress) {
    //     signer = createSignerWithSecretKey(fromAddressPrivateKey)
    // }
    const tx = new Transaction();
    tx.setSender(fromAddress);
    const coins = await suiClient.getCoins({
        owner: fromAddress,
        coinType: tokenAddress
    });
    const totalAmount = amount * toAccounts.length;

    const totalBalance = coins.data.map(coin => coin.balance).reduce((acc, curr) => acc + curr, 0);
    if (totalBalance + config?.transferGasFee < totalAmount) {
        throw new Error("Insufficient Balance");
    }

    for (let i = 0; i < toAccounts.length; i++) {
        const suiCoin = coinWithBalance({ balance: amount });
        tx.transferObjects([suiCoin], toAccounts[i]);
    }


    // const sufficientCoins = coins.data.filter(coin => BigInt(coin.balance) >= BigInt(totalAmount));
    // // console.log(totalAmount, sufficientCoins[0].coinObjectId)
    // if (sufficientCoins.length > 0) {
    //     for (let i = 0; i < toAccounts.length; i++) {
    //         const [splitCoin] = tx.splitCoins(tokenAddress === config?.suiTokenAddress ? tx.gas : tx.object(sufficientCoins[0].coinObjectId), [amount]);
    //         tx.transferObjects([splitCoin], toAccounts[i]);
    //     }
    // } else {
    //     let requiredAmount = BigInt(totalAmount);
    //     let collectedCoins = [];
    //     let totalBalance = BigInt(0);
    //     for (let coin of coins.data) {
    //         collectedCoins.push(tx.object(coin.coinObjectId));
    //         totalBalance += BigInt(coin.balance);
    //         if (totalBalance >= requiredAmount) break;
    //     }
    //     if (totalBalance < requiredAmount) {
    //         throw new Error("Insufficient balance to complete the transfer.");
    //     }

    //     const mergedCoin = tx.mergeCoins(collectedCoins[0], collectedCoins.slice(1));
    //     for (let i = 0; i < toAccounts.length; i++) {
    //         const [splitCoin] = tx.splitCoins(tokenAddress === config?.suiTokenAddress ? tx.gas : tx.object(mergedCoin), [amount]);
    //         tx.transferObjects([splitCoin], toAccounts[i]);
    //     }

        // const [splitCoin] = tx.splitCoins(tx.object(coin.coinObjectId), [amount]);
        // tx.transferObjects([splitCoin], toAddress);
    // }
    // if (tokenAddress === config.suiTokenAddress) {
    //     const coins = tx.splitCoins(tx.gas, transferData.map((transfer) => transfer.amount));
    //     transferData.forEach((transfer, index) => {
    //         tx.transferObjects([coins[index]], transfer.to);
    //     });
    // }
    console.log("Executing")
    const res = await suiClient.signAndExecuteTransaction({
        transaction: tx,
        signer: signer
    });

    await suiClient.waitForTransaction({ digest: res.digest });
    console.log(res);
    return res?.digest;

}
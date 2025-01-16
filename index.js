const { createSigner, createWallets, createSignerWithSecretKey } = require("./cetus/keypair");
const { getClmmPools, getPresSwapOutput, swap } = require("./cetus/swap");
const { getBalance, transfer, batchTransferWithSameFromAddress } = require("./cetus/utils");
const config = require("./config");
const { saveJsonToFile, getJson, saveJsonRewrite } = require("./helpers/storage");

const database = require("./db/pg.js");



// const suiToken = "0x2::sui::SUI";
// const suiTokenDecimals = 9
// const otherTokenAddress = "0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC";
// const otherTokenDecimals = 6;
// const poolAddress = "0xb8d7d9e66a60c239e7a60110efcf8de6c705580ed924d0dde141f4a0e2c90105"
// const amountIn = 100000000
// const slippage = 0.1

const BigNumber = require("bignumber.js");
const subtractBigNumber = (x, y) => new BigNumber(x).minus(new BigNumber(y)).toString();


function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

const retrievingFunds = async (wallets, mainWallet) => {
    // console.log("Initiating ", wallets.length)
    for (let i = 0; i < wallets.length; i++) {
        const balance = await getBalance(wallets[i]?.publicKey, config?.suiTokenAddress);
        console.log("Balance: ", balance);
        console.log(Number(subtractBigNumber(balance.toString(), config?.transferGasFee.toString())))
        // const tx = await transfer(wallets[i]?.publicKey, config?.baseAddress, config?.suiTokenAddress, Number(balance.toString()), createSignerWithSecretKey(wallets[i].privateKey));
       let tx;
        if(config?.leaveNativeTokenPercent > 0) {
            tx = await transfer(wallets[i]?.publicKey, mainWallet?.publicKey, config?.suiTokenAddress, Number(subtractBigNumber(balance.toString(), config?.leftAmountWhenleaveNativeTokenPercent.toString())), createSignerWithSecretKey(wallets[i].privateKey));
        } else {
            tx = await transfer(wallets[i]?.publicKey, mainWallet?.publicKey, config?.suiTokenAddress, Number(subtractBigNumber(balance.toString(), config?.transferGasFee.toString())), createSignerWithSecretKey(wallets[i].privateKey));
        }
        console.log(`Transferred ${tx} from wallet ${wallets[i].publicKey}`);
        wallets[i].isActive = false;
    }
    // console.log(wallets)
    return wallets;
}

// retrievingFunds([
//     {
//         "privateKey": "suiprivkey1qpkjxpda4uqzvpx5urj4he5x4c565yxpzdpez9s35tguruclaxpt564ftpr",
//         "publicKey": "0xbba57c65b1027c8a245c563231f649c0459703afd6fd3102a9bb3873bcacc3ab",
//         "isActive": true
//     }
// ])

const initiateSwapping = async (wallets, mainWallet) => {
    for (let k = 0; k < config?.tradeCountPerWallet; k++) {
        for (let i = 0; i < wallets.length; i++) {
            const time = (Math.floor(Math.random() * (config?.maxNewTradeTime - config?.minNewTradeTime + 1)) + config?.minNewTradeTime) * 1000;
            console.log(`Sleeping for ${time}`);
            await sleep(time);
            console.log(`Initiating Swaps on both sides for wallet: ${wallets[i].publicKey}`);
            const signer = createSignerWithSecretKey(wallets[i]?.privateKey);


            const [nativeTokenBalance, otherTokenBalance] = await Promise.all([getBalance(wallets[i]?.publicKey, config?.suiTokenAddress), getBalance(wallets[i]?.publicKey, config?.otherTokenAddress)]);
            console.log(`Total Balance Now 1: Sui token: ${nativeTokenBalance}, other token: ${otherTokenBalance}`);

            const start = new Date()
            const buyTx = await swap(config?.poolAddress, config?.tradeAmount, config?.slippage, config?.otherTokenAddress, true, signer, wallets[i]?.publicKey, nativeTokenBalance, nativeTokenBalance);
            console.log(`Transaction Signature: ${buyTx}`);

            const [newNativeTokenBalance1, newOtherTokenBalance1] = await Promise.all([getBalance(wallets[i]?.publicKey, config?.suiTokenAddress), getBalance(wallets[i]?.publicKey, config?.otherTokenAddress)]);
            console.log(`Total Balance Now 2: Sui token: ${newNativeTokenBalance1}, other token: ${newOtherTokenBalance1}`);

            const sellTx = await swap(config?.poolAddress, Math.floor(Number(subtractBigNumber(newOtherTokenBalance1.toString(), (newOtherTokenBalance1 * (config?.leaveNativeTokenPercent / 100)).toString()))), config?.slippage, config?.otherTokenAddress, false, signer, wallets[i]?.publicKey, newOtherTokenBalance1, newNativeTokenBalance1);
            console.log(`Transaction Signature: ${sellTx}`);
            const end = new Date();

            const [newNativeTokenBalance2, newOtherTokenBalance2] = await Promise.all([getBalance(wallets[i]?.publicKey, config?.suiTokenAddress), getBalance(wallets[i]?.publicKey, config?.otherTokenAddress)]);
            console.log(`Total Balance Now 3: Sui token: ${newNativeTokenBalance2}, other token: ${newOtherTokenBalance2}`);


            console.log(`Time taken: ${end - start}`);
            await saveJsonToFile([{
                buyTx: buyTx,
                sellTx: sellTx,
                timeTaken: end - start
            }], './assets/transactions.json');

        }
    }

    console.log("Initiating collection of funds and generating on new wallets");
    const updatedWallets = await retrievingFunds(wallets, mainWallet);
    return updatedWallets;
}




const runVolumeBot = async () => {
    console.log("[Initializing]");

    console.log(`Number of Wallets to Generate: ${config?.walletCount}`);
    let wallets = createWallets(config?.walletCount);
    console.log("Storing Wallets");
    // console.log(wallets);
    await saveJsonToFile(wallets, config?.walletFilePath);

    const mainWalletJson = await getJson(config?.mainWalletFilePath);
    let mainWallet = {}
    for(let wallets of mainWalletJson) {
        if(wallets["isActive"] == true) {
            mainWallet = wallets;
            break;
        }
    }
    if(!mainWallet?.isActive) {
        throw new Error("No main Wallet is Active");
    }



    let globalCount = 0;
    let globalRecursionCount = config?.globalRecursionCount;
    while (globalCount < globalRecursionCount) {
        console.log("Extracting Addresses");
        const addresses = wallets.map(wallet => wallet.publicKey);
        console.log("Batch transfer command");
        const txId = await batchTransferWithSameFromAddress(addresses, mainWallet?.publicKey, config?.suiTokenAddress, config?.amountIn, mainWallet?.privateKey);
        console.log(`Transaction ID: ${txId}`);


        console.log("Initiating Swaps");
        const updatedWallets = await initiateSwapping(wallets, mainWallet);
        console.log("[Done]: ", globalCount);

        globalCount++;
        if(config?.globalRecursionCount === -1) {
            globalRecursionCount +=1;
        }

        if(globalRecursionCount % config?.changeMainWalletRecursion === 0) {
            console.log("Initiate changing of main wallet");
            const newMainWallets = createWallets(1);
            const mainWalletJson = await getJson(config?.mainWalletFilePath);
            for (let wallet of mainWalletJson) {
                wallet["isActive"] = false
            }
            let previousWallet = mainWallet;
            for (let wallet of newMainWallets) {
                mainWalletJson.push(wallet);
                mainWallet = wallet;
            }
            await saveJsonRewrite(mainWalletJson, config?.mainWalletFilePath);
            console.log("Transferring main wallet balance to new Wallet");
            const mainWalletSigner = createSignerWithSecretKey(mainWallet?.privateKey);
            //todo transfer
            const balance = await getBalance(previousWallet?.publicKey, config?.suiTokenAddress);

            tx = await transfer(previousWallet?.publicKey, mainWallet?.publicKey, config?.suiTokenAddress, Number(subtractBigNumber(balance.toString(), config?.transferGasFee.toString())), createSignerWithSecretKey(previousWallet?.privateKey));


        }

        const newWallets = createWallets(config?.walletCount);
        const data = await getJson(config?.walletFilePath);
        for (let wallet of updatedWallets) {
            const foundObject = data.find(obj => obj["publicKey"] === wallet?.publicKey);
            if (foundObject) {
                foundObject["isActive"] = wallet?.isActive;
            } else {
                data.push(wallet)
            }
        }

        for (let wallet of newWallets) {
            data.push(wallet)
        }

        await saveJsonRewrite(data, config?.walletFilePath);
        wallets = newWallets;


    }




    // await getPresSwapOutput(config.poolAddress, config.amountIn.toString(), config.slippage.toString(), config.otherTokenAddress, true);
    // await getBalance("0xb225f7b2d4676ae8f691cbf6fcf8b32d75b55531e87fb806f5a7fffe64b52876", config.otherTokenAddress);
    // await transfer(config.baseAddress, config.baseAddress, config.suiTokenAddress, 1000);

    // createWallets(1);

    // const batchTransferData = [
    //     {
    //         to: config.baseAddress,
    //         amount: 100000
    //     },
    //     {
    //         to: config.baseAddress,
    //         amount: 150000
    //     }
    // ]

    // await batchTransferWithSameFromAddress(batchTransferData, config.baseAddress, config.suiTokenAddress);
}








// const tranr = async () => {
//     const updatedWallets = [
//         {
//             "privateKey": "suiprivkey1qpe9gys2ua57v9uqzmqjazv2nhqkaz4aaxdmpt0lplujl4czqdf9gc505k3",
//             "publicKey": "0xc73c2e77385d87699e88234d0662339df7c8070617e5dd2053324415dafa7cb5",
//             "isActive": false
//         }
//     ]
//     const data = await getJson(config?.walletFilePath);
//     for (let wallet of updatedWallets) {
//         const foundObject = data.find(obj => obj["publicKey"] === wallet?.publicKey);
//         if (foundObject) {
//             foundObject["isActive"] = wallet?.isActive;
//         } else {
//             data.push(wallet)
//         }
//     }

//     await saveJsonRewrite(data, config?.walletFilePath);
// }

// tranr()



// const runtrial = async (wallets) => {
//     const start = new Date()
//     const [newNativeTokenBalance, newOtherTokenBalance] = await Promise.all([getBalance(wallets.publicKey, config?.suiTokenAddress), getBalance(wallets.publicKey, config?.otherTokenAddress)]);
//     console.log(`Total Balance Now: Sui token: ${newNativeTokenBalance}, other token: ${newOtherTokenBalance}`);
//     const signer = createSignerWithSecretKey(wallets?.privateKey);

//     const buyTx = await swap(config?.poolAddress, config?.amountIn, config?.slippage, config?.otherTokenAddress, true, signer, wallets?.publicKey, newNativeTokenBalance, newNativeTokenBalance);
//     console.log(`Transaction Signature: ${buyTx}`);

//     const [newNativeTokenBalance1, newOtherTokenBalance1] = await Promise.all([getBalance(wallets.publicKey, config?.suiTokenAddress), getBalance(wallets.publicKey, config?.otherTokenAddress)]);
//     console.log(`Total Balance Now: Sui token: ${newNativeTokenBalance1}, other token: ${newOtherTokenBalance1}`);

//     const sellTx = await swap(config?.poolAddress, newOtherTokenBalance1, config?.slippage, config?.otherTokenAddress, false, signer, wallets?.publicKey, newOtherTokenBalance1, newNativeTokenBalance1);
//     console.log(`Transaction Signature: ${sellTx}`);

//     const [newNativeTokenBalance2, newOtherTokenBalance2] = await Promise.all([getBalance(wallets.publicKey, config?.suiTokenAddress), getBalance(wallets.publicKey, config?.otherTokenAddress)]);
//     console.log(`Total Balance Now: Sui token: ${newNativeTokenBalance2}, other token: ${newOtherTokenBalance2}`);
//     const end = new Date();
//     console.log(`Time taken: ${end - start}`)

// }

// runtrial(
//     {
//         "privateKey": "suiprivkey1qzklz29a2qxyh8npv2djgnmpyh7l7st7gu60z9m33andzwpwreecxegdfr2",
//         "publicKey": "0xcd95fcf8b8c8ac65fc53ce18cd40ec525b60c54bcd57d215745cbaa4e808b0e8",
//         "isActive": true
//     }
// )

const { SuiClient, getFullnodeUrl } = require("@mysten/sui/client");
const { initCetusSDK, adjustForSlippage, Percentage, d, CetusClmmSDK, TransactionUtil } = require('@cetusprotocol/cetus-sui-clmm-sdk');
const bn = require('bn.js')
const { createSigner, createSignerWithSecretKey } = require("./keypair");
const config = require("../config");
const { Transaction } = require("@mysten/sui/transactions");

const cetusClmmSDK = initCetusSDK({ network: 'mainnet', fullNodeUrl: "https://fullnode.mainnet.sui.io:443", simulationAccount: "0xb225f7b2d4676ae8f691cbf6fcf8b32d75b55531e87fb806f5a7fffe64b52876" });
// cetusClmmSDK.senderAddress = "0xb225f7b2d4676ae8f691cbf6fcf8b32d75b55531e87fb806f5a7fffe64b52876"

const suiClient = new SuiClient({ url: getFullnodeUrl('mainnet') });

//keep token address fixed as other token address, never sui token address
exports.swap = async (poolAddress, amountIn, slippage, tokenAddress, isBuy, signer, senderAddress, tokenBalance, nativeTokenBalance) => {
    cetusClmmSDK.senderAddress = senderAddress;
    let amountToSend = 0;
    if (tokenAddress === config?.suiTokenAddress) {
        const amountEligibleForSending = nativeTokenBalance - config?.swapGasFee;
        amountToSend = amountIn > amountEligibleForSending ? amountIn : amountEligibleForSending;
    } else {

        amountToSend = tokenBalance >= amountIn ? amountIn : tokenBalance;
        if (nativeTokenBalance < config?.swapGasFee) {
            throw new Error("Insufficient funds in wallet for swap");
        }
    }

    if (amountToSend <= 0) {
        throw new Error("Amount Ineligible for swap");
    }
    const pool = await cetusClmmSDK.Pool.getPool(poolAddress);
    const a2b = isBuy ? (pool.coinTypeA === tokenAddress ? false : true) : (pool.coinTypeA === tokenAddress ? true : false);
    console.log(a2b)
    const by_amount_in = true;
    console.log("Calculating Output")
    const res = await cetusClmmSDK.Swap.preswap({
        pool: pool,
        currentSqrtPrice: pool.current_sqrt_price,
        coinTypeA: pool.coinTypeA,
        coinTypeB: pool.coinTypeB,
        decimalsA: pool.coinTypeA === tokenAddress ? 6 : 9, // coin a 's decimals
        decimalsB: pool.coinTypeB === tokenAddress ? 9 : 6, // coin b 's decimals
        a2b,
        byAmountIn: by_amount_in,
        amount: amountIn,
    });
    const amountLimit = adjustForSlippage(new bn(res.estimatedAmountOut), Percentage.fromDecimal(d(slippage)), !by_amount_in);
    // console.log(amountLimit.toString())

    console.log("Building Transaction");
    const transactionBlock = await cetusClmmSDK.Swap.createSwapTransactionPayload({
        pool_id: pool.poolAddress,
        coinTypeA: pool.coinTypeA,
        coinTypeB: pool.coinTypeB,
        a2b: a2b,
        by_amount_in: by_amount_in,
        amount: res.amount.toString(),
        amount_limit: amountLimit.toString(),
    });

    console.log("Executing Swap");
    const tx = await suiClient.signAndExecuteTransaction({
        signer,
        transaction: transactionBlock,
        options: {
            showEffects: true,
            showObjectChanges: true,
        }
    })

    await suiClient.waitForTransaction({ digest: tx.digest });
    return tx?.digest;

}



const batchSwap = async (poolAddress, amountIn, slippage, tokenAddress, isBuy, signer, senderAddress, tokenBalance, nativeTokenBalance) => {
    cetusClmmSDK.senderAddress = senderAddress;
    let amountToSend = 0;
    if (tokenAddress === config?.suiTokenAddress) {
        const amountEligibleForSending = nativeTokenBalance - config?.swapGasFee;
        amountToSend = amountIn > amountEligibleForSending ? amountIn : amountEligibleForSending;
    } else {

        amountToSend = tokenBalance >= amountIn ? amountIn : tokenBalance;
        if (nativeTokenBalance < config?.swapGasFee) {
            throw new Error("Insufficient funds in wallet for swap");
        }
    }

    if (amountToSend <= 0) {
        throw new Error("Amount Ineligible for swap");
    }
    const pool = await cetusClmmSDK.Pool.getPool(poolAddress);
    console.log(pool);
    return;
    const a2b = isBuy ? (pool.coinTypeA === tokenAddress ? false : true) : (pool.coinTypeA === tokenAddress ? true : false);
    console.log(a2b)
    const by_amount_in = true;
    console.log("Calculating Output")
    const res = await cetusClmmSDK.Swap.preswap({
        pool: pool,
        currentSqrtPrice: pool.current_sqrt_price,
        coinTypeA: pool.coinTypeA,
        coinTypeB: pool.coinTypeB,
        decimalsA: pool.coinTypeA === tokenAddress ? 6 : 9, // coin a 's decimals
        decimalsB: pool.coinTypeB === tokenAddress ? 9 : 6, // coin b 's decimals
        a2b,
        byAmountIn: by_amount_in,
        amount: amountIn,
    });
    const amountLimit = adjustForSlippage(new bn(res.estimatedAmountOut), Percentage.fromDecimal(d(slippage)), !by_amount_in);
    // console.log(amountLimit.toString())

    console.log("Building Transaction");
    let transactionBlock = await cetusClmmSDK.Swap.createSwapTransactionPayload({
        pool_id: pool.poolAddress,
        coinTypeA: pool.coinTypeA,
        coinTypeB: pool.coinTypeB,
        a2b: a2b,
        by_amount_in: by_amount_in,
        amount: res.amount.toString(),
        amount_limit: amountLimit.toString(),
    });

    const transactionBlock2 = await cetusClmmSDK.Swap.createSwapTransactionPayload({
        pool_id: pool.poolAddress,
        coinTypeA: pool.coinTypeA,
        coinTypeB: pool.coinTypeB,
        a2b: a2b,
        by_amount_in: by_amount_in,
        amount: res.amount.toString(),
        amount_limit: amountLimit.toString(),
    });

    let transactionBlock3 = await cetusClmmSDK.Swap.createSwapTransactionWithoutTransferCoinsPayload({
        pool_id: pool.poolAddress,
        coinTypeA: pool.coinTypeA,
        coinTypeB: pool.coinTypeB,
        a2b: a2b,
        by_amount_in: by_amount_in,
        amount: res.amount.toString(),
        amount_limit: amountLimit.toString(),
    });

    let transactionBlock4 = await cetusClmmSDK.Swap.createSwapTransactionWithoutTransferCoinsPayload({
        pool_id: pool.poolAddress,
        coinTypeA: pool.coinTypeA,
        coinTypeB: pool.coinTypeB,
        a2b: a2b,
        by_amount_in: by_amount_in,
        amount: res.amount.toString(),
        amount_limit: amountLimit.toString(),
    });
    transactionBlock3.tx.add(transactionBlock4.tx)
    console.log(transactionBlock3.tx.getData())
    console.log()
    const transactionBLock5 = TransactionUtil.buildSwapTransaction(cetusClmmSDK, {
        pool_id: pool.poolAddress,
        coinTypeA: pool.coinTypeA,
        coinTypeB: pool.coinTypeB,
        a2b: a2b,
        by_amount_in: by_amount_in,
        amount: res.amount.toString(),
        amount_limit: amountLimit.toString(),
    })
    // console.log(transactionBlock3.tx.getData())

    // transactionBlock.add(transactionBlock2)
    // console.log(transactionBlock.getData())
    // let tx = new Transaction();
    // // transactionBlock.getData().commands.forEach(command => final.add(command));
    // // transactionBlock2.getData().commands.forEach(command => final.add(command));
    // // transactionBlock.getData().inputs.forEach(input => final.add(input));
    // // transactionBlock2.getData().inputs.forEach(input => final.add(input));
    // // final.setSender("0xb225f7b2d4676ae8f691cbf6fcf8b32d75b55531e87fb806f5a7fffe64b52876");
    // // final.getData.inputs = [...transactionBlock.getData().inputs]

    // // console.log(transactionBlock.object.option())
    // // final.;
    // // final.add(transactionBlock)
    // // final.add(transactionBlock2)
    // console.log("Executing Swap");
    // // const tx = await suiClient.signAndExecuteTransaction({
    // //     signer,
    // //     transaction: final,
    // //     options: {
    // //         showEffects: true,
    // //         showObjectChanges: true,
    // //     }
    // // })
    // // console.log(tx?.digest)

    // // await suiClient.waitForTransaction({ digest: tx.digest });
    // // return tx?.digest;


    // const allCoinAsset = await cetusClmmSDK.getOwnerCoinAssets(config?.baseAddress);
    // // console.log(allCoinAsset)
    // tx.setSender(config?.baseAddress);
    // const primaryCoinInputA = TransactionUtil.buildCoinForAmount(
    //     tx,
    //     allCoinAsset,
    //     a2b ? BigInt(by_amount_in ? res.amount.toString() : amountLimit.toString()) : BigInt(0),
    //     pool.coinTypeA,
    //     false
    // )

    // const primaryCoinInputB = TransactionUtil.buildCoinForAmount(
    //     tx,
    //     allCoinAsset,
    //     a2b ? BigInt(0) : BigInt(by_amount_in ? res.amount.toString() : amountLimit.toString()),
    //     pool.coinTypeB,
    //     false
    // )

    // tx = TransactionUtil.buildSwapTransactionArgs(tx, {
    //     pool_id: pool.poolAddress,
    //     coinTypeA: pool.coinTypeA,
    //     coinTypeB: pool.coinTypeB,
    //     a2b: a2b,
    //     by_amount_in: by_amount_in,
    //     amount: res.amount.toString(),
    //     amount_limit: amountLimit.toString(),
    // }, cetusClmmSDK.sdkOptions, primaryCoinInputA, primaryCoinInputB)
    // console.log(tx.getData())


    // const primaryCoinInputA2 = TransactionUtil.buildCoinForAmount(
    //     tx,
    //     allCoinAsset,
    //     a2b ? BigInt(by_amount_in ? res.amount.toString() : amountLimit.toString()) : BigInt(0),
    //     pool.coinTypeA,
    //     false
    // )

    // const primaryCoinInputB2 = TransactionUtil.buildCoinForAmount(
    //     tx,
    //     allCoinAsset,
    //     a2b ? BigInt(0) : BigInt(by_amount_in ? res.amount.toString() : amountLimit.toString()),
    //     pool.coinTypeB,
    //     false
    // )

    // tx = TransactionUtil.buildSwapTransactionArgs(tx, {
    //     pool_id: pool.poolAddress,
    //     coinTypeA: pool.coinTypeA,
    //     coinTypeB: pool.coinTypeB,
    //     a2b: a2b,
    //     by_amount_in: by_amount_in,
    //     amount: res.amount.toString(),
    //     amount_limit: amountLimit.toString(),
    // }, cetusClmmSDK.sdkOptions, primaryCoinInputA2, primaryCoinInputB2)
    // console.log(tx.getData())

    // tx.setGasBudget(5000000)
    // console.log("Executing Swap");
    // const tx1 = await suiClient.signAndExecuteTransaction({
    //     signer,
    //     transaction: tx,
    //     options: {
    //         showEffects: true,
    //         showObjectChanges: true,
    //     }
    // })
    // console.log(tx1?.digest)


}

const signer = createSigner(config?.baseMnemonic);

const buyTx = batchSwap("0xb785e6eed355c1f8367c06d2b0cb9303ab167f8359a129bb003891ee54c6fce0", config?.tradeAmount, config?.slippage, config?.otherTokenAddress, true, signer, config?.baseAddress, 1000000000, 1000000000);

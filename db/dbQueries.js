const db = require("./pg.js");

exports.getActiveWallet = async() => {
    try {
    const rows = await db.query("SELECT * FROM wallets where isactive=$1", [true]);
    return rows;
    } catch(err) {
        console.log("Error in [getActiveWallet]: ", err);
        throw new Error("Error in [getActiveWallet]");
    }
}

exports.updateInactiveWallets = async() => {
    try {
    const rows = await db.query("UPDATE wallets set isactive=$1", [false]);
    return rows;
    } catch(err) {
        console.log("Error in [getActiveWallet]: ", err);
        throw new Error("Error in [getActiveWallet]");
    }
}

exports.insertActiveWallet = async(publicKey, privateKey) => {
    try {
    const rows = await db.query("INSERT INTO wallets (publicKey, privateKey, isactive) VALUES ($1, $2, $3);", [publicKey, privateKey, true]);
    return rows;
    } catch(err) {
        console.log("Error in [insertActiveWallet]: ", err);
        throw new Error("Error in [insertActiveWallet]");
    }
}


exports.getConfigValue = async(key) => {
    try {
    const rows = await db.query("SELECT value FROM config where key=$1", [key]);
    return rows;
    } catch(err) {
        console.log("Error in [getConfigValue]: ", err);
        throw new Error("Error in [getConfigValue]");
    }
}

exports.updateConfigValue = async(key, value) => {
    try {
    const rows = await db.query("UPDATE config SET value=$1 WHERE key=$2", [value, key]);
    return rows;
    } catch(err) {
        console.log("Error in [updateConfigValue]: ", err);
        throw new Error("Error in [updateConfigValue]");
    }
}

exports.getAllConfigs = async(key) => {
    try {
    const rows = await db.query("SELECT * FROM config");
    return rows;
    } catch(err) {
        console.log("Error in [getAllConfigs]: ", err);
        throw new Error("Error in [getAllConfigs]");
    }
}

exports.insertSwapTransaction = async (buyTx, sellTx, time, suilost) => {
    try {
        const rows = await db.query(
            "INSERT INTO swaptransactions (buytx, selltx, time, suilost) VALUES ($1, $2, $3, $4);",
            [buyTx, sellTx, time, suilost]
        );
        return rows;
    } catch (err) {
        console.error("Error in [insertSwapTransaction]:", err);
        throw new Error("Error in [insertSwapTransaction]");
    }
};

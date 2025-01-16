const db = require("../database/pg");

exports.getPosDetailsByMachineId = async(id) => {
    try {
    const rows = await db.query("SELECT * FROM posdetails WHERE machineid=$1", [id]);
    return rows;
    } catch(err) {
        console.log("Error in [insertNotification]: ", err);
        throw new Error("Error in inserting notification");
    }
}

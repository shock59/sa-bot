import type { Snowflake } from "discord.js";
import Database from "../../common/database.js";
import constants from "../../common/constants.js";

export const BOARD_EMOJI = constants.env === "production" ? "🥔" : "⭐",
	REACTIONS_NAME = constants.env === "production" ? "Potatoes" : "Stars";

export const boardDatabase = new Database<{
	/** The number of reactions this message has. */
	reactions: number;
	/** The ID of the user who posted this. */
	user: Snowflake;
	/** The ID of the channel this message is in. */
	channel: Snowflake;
	/** The ID of the message on the board. */
	onBoard: Snowflake | 0;
	/** The ID of the original message. */
	source: Snowflake;
}>("board");
await boardDatabase.init();

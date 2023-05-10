import {
	APIEmbed,
	ButtonStyle,
	ChannelType,
	ComponentType,
	Embed,
	PermissionFlagsBits,
	TextChannel,
	ThreadChannel,
} from "discord.js";

import { getBaseChannel } from "../../util/discord.js";
import CONSTANTS from "../../common/CONSTANTS.js";

export const LOG_GROUPS = ["server", "messages", "channels", "members", "voice"] as const;

export function shouldLog(channel: import("discord.js").TextBasedChannel | null): boolean {
	const baseChannel = getBaseChannel(channel);

	return Boolean(
		baseChannel?.type !== ChannelType.DM &&
			baseChannel?.guild.id === CONSTANTS.guild.id &&
			baseChannel
				?.permissionsFor(CONSTANTS.roles.mod || baseChannel.guild.id)
				?.has(PermissionFlagsBits.ViewChannel),
	);
}

export default async function log(
	content: `${LoggingEmojis} ${string}`,
	group: typeof LOG_GROUPS[number],
	extra: {
		embeds?: (Embed | APIEmbed)[];
		files?: (string | { extension?: string; content: string; url?: never })[];
		button?: { label: string; url: string };
	} = {},
) {
	const thread = await getLoggingThread(group);

	const externalFileIndex = extra.files?.findIndex((file) => {
		if (typeof file === "string" || file.content.includes("```")) return true;

		const lines = file.content.split("\n");
		if (lines.length > 6 || lines.find((line) => line.length > 50)) return true;

		return false;
	});
	const embeddedFiles = extra.files?.splice(
		0,
		externalFileIndex === -1 ? undefined : externalFileIndex,
	);

	return await thread.send({
		content:
			content +
			(embeddedFiles?.length
				? "\n" +
				  embeddedFiles
						.map((file) =>
							typeof file === "string"
								? file
								: `\`\`\`${file.extension}\n${file.content}\n\`\`\``,
						)
						.join("\n")
				: ""),
		allowedMentions: { users: [] },
		embeds: extra.embeds,
		components: extra.button && [
			{
				components: [
					{
						label: extra.button.label,
						style: ButtonStyle.Link,
						type: ComponentType.Button,
						url: extra.button.url,
					},
				],
				type: ComponentType.ActionRow,
			},
		],
		files: await Promise.all(
			extra.files?.map(async (file) => {
				if (typeof file === "string") {
					const response = await fetch(file);
					return {
						attachment: Buffer.from(await response.arrayBuffer()),
						name: new URL(file).pathname.split("/").at(-1),
					};
				}

				return {
					attachment: Buffer.from(file.content, "utf8"),
					name: `file.${file.extension || "txt"}`,
				};
			}) ?? [],
		),
	});
}

export async function getLoggingThread(
	group?: typeof LOG_GROUPS[number] | typeof import("../../common/database").DATABASE_THREAD,
): Promise<ThreadChannel>;
export async function getLoggingThread(group?: undefined): Promise<TextChannel>;
export async function getLoggingThread(
	group?:
		| typeof LOG_GROUPS[number]
		| typeof import("../../common/database").DATABASE_THREAD
		| undefined,
) {
	if (!CONSTANTS.channels.modlogs) throw new ReferenceError("Cannot find logs channel");
	if (!group) return CONSTANTS.channels.modlogs;

	const threads = await CONSTANTS.channels.modlogs.threads.fetchActive();

	return (
		threads.threads.find((thread) => thread.name === group) ||
		(await CONSTANTS.channels.modlogs.threads.create({
			name: group,
			reason: "New logging thread",
		}))
	);
}

export enum LoggingEmojis {
	Members = "👥",
	UserUpdate = "👤",
	SettingsChange = "📋",
	ServerUpdate = "✨",
	Invites = "👋",
	Roles = "🏷",
	MessageDelete = "🗑",
	MessageUpdate = "🌐",
	MessageEdit = "📝",
	Voice = "🔊",
	Channel = "🗄",
	Ban = "🔨",
	Events = "🗓",
}

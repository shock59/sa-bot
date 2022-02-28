/** @file Commands To manage modmails. */
import { SlashCommandBuilder } from "@discordjs/builders";
import { MessageActionRow, MessageButton, MessageEmbed } from "discord.js";

import {
	closeModmail,
	getThreadFromMember,
	MODMAIL_CHANNEL,
	sendOpenedMessage,
} from "../common/modmail.js";
import generateHash from "../lib/generateHash.js";

/** @type {import("../types/command").default} */
const info = {
	data: new SlashCommandBuilder()
		.setDefaultPermission(false)
		.setDescription(".")
		.addSubcommand((subcommand) =>
			subcommand
				.setName("close")
				.setDescription("(Mods only) Close a modmail ticket.")
				.addStringOption((input) =>
					input
						.setName("reason")
						.setDescription(
							"Reason for closing the ticket (this will be posted here as well as being sent to the user)",
						)
						.setRequired(true),
				),
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName("start")
				.setDescription(
					"(Mods only) Start a modmail ticket with a user. (Non-mods may start a ticket by DMing me.)",
				)
				.addUserOption((input) =>
					input
						.setName("user")
						.setDescription("The user to start a ticket with.")
						.setRequired(true),
				),
		),

	async interaction(interaction) {
		const command = interaction.options.getSubcommand();

		switch (command) {
			case "close": {
				if (
					interaction.channel?.type !== "GUILD_PUBLIC_THREAD" ||
					interaction.channel.parentId !== MODMAIL_CHANNEL ||
					!interaction.guild
				) {
					await interaction.reply({
						content: `<:no:940054047854047282> This command can only be used in threads in <#${MODMAIL_CHANNEL}>.`,
						ephemeral: true,
					});

					return;
				}

				const reason = interaction.options.getString("reason") || "";
				await interaction.reply({
					content: `<:yes:940054094272430130> Modmail ticket closed! ${reason}`,
				});

				await closeModmail(interaction.channel, interaction.user, reason);

				break;
			}
			case "start": {
				const user = await interaction.guild?.members.fetch(
					interaction.options.getUser("user") || "",
				);

				if (!user || !interaction.guild) {
					await interaction.reply({
						content: "<:no:940054047854047282> Could not find user.",
						ephemeral: true,
					});

					return;
				}

				const thread = await getThreadFromMember(interaction.guild, user);

				if (thread) {
					await interaction.reply({
						content: "<:no:940054047854047282> User already has a ticket open.",
						ephemeral: true,
					});

					return;
				}

				/** @type {Promise<unknown>[]} */
				const promises = [];

				const mailChannel = await interaction.guild.channels.fetch(MODMAIL_CHANNEL);

				if (!mailChannel) throw new Error("Could not find modmail channel");

				if (mailChannel.type !== "GUILD_TEXT")
					throw new Error("Modmail channel is not a text channel");

				const confirmEmbed = new MessageEmbed()
					.setTitle("Confirmation")
					.setDescription(
						`Are you sure you want to send this message to ${user?.user.toString()}?`,
					)
					.setColor("BLURPLE")
					.setAuthor({
						iconURL: user.displayAvatarURL(),
						name: user.displayName || user.user.username,
					});

				const button = new MessageButton()
					.setLabel("Confirm")
					.setStyle("PRIMARY")
					.setCustomId(generateHash("confirm"));
				const cancelButton = new MessageButton()
					.setLabel("Cancel")
					.setCustomId(generateHash("cancel"))
					.setStyle("SECONDARY");

				await interaction.reply({
					components: [new MessageActionRow().addComponents(button, cancelButton)],
					embeds: [confirmEmbed],
					ephemeral: true,
					fetchReply: true,
				});

				interaction.channel
					?.createMessageComponentCollector({
						filter: (buttonInteraction) =>
							[button.customId, cancelButton.customId].includes(
								buttonInteraction.customId,
							) && buttonInteraction.user.id === interaction.user.id,

						time: 30_000,
					})
					.on("collect", async (buttonInteraction) => {
						switch (buttonInteraction.customId) {
							case button.customId: {
								const openedEmbed = new MessageEmbed()
									.setTitle("Modmail ticket opened")
									.setDescription(
										`Ticket to ${user.toString()} (by ${interaction.user.toString()})`,
									)
									.setFooter({
										text: "Please note that reactions, replies, edits, and deletes are not supported.",
									})
									.setColor("BLURPLE");

								const starterMessage = await mailChannel.send({
									embeds: [openedEmbed],
								});

								const thread = await starterMessage.startThread({
									name: `${user.user.username} (${user.id})`,
								});
								await Promise.all([
									sendOpenedMessage(user).then((success) => {
										if (!success)
											return interaction.reply({
												content:
													"<:no:940054047854047282> Could not DM user. Ask them to open their DMs.",

												ephemeral: true,
											});
									}),
									buttonInteraction.reply({
										content: `<:yes:940054094272430130> Modmail ticket opened! Send them a message in ${thread.toString()}.`,
										ephemeral: true,
									}),
								]);
								button.setDisabled(true);

								break;
							}
							case cancelButton.customId: {
								await buttonInteraction.reply({
									content: "<:no:940054047854047282> Modmail canceled",
									ephemeral: true,
								});

								break;
							}
						}
					});

				await Promise.all(promises);

				break;
			}
		}
	},

	permissions: [{ id: process.env.MODERATOR_ROLE || "", permission: true, type: "ROLE" }],
};

export default info;

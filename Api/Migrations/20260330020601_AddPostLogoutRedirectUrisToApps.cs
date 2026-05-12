using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Api.Migrations
{
    /// <inheritdoc />
    public partial class AddPostLogoutRedirectUrisToApps : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Department",
                table: "Users",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Email",
                table: "Users",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "UserType",
                table: "Users",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "AdminUrl",
                table: "Apps",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "BaseUrl",
                table: "Apps",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Description",
                table: "Apps",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string[]>(
                name: "PostLogoutRedirectUris",
                table: "Apps",
                type: "text[]",
                nullable: false,
                defaultValue: new string[0]);

            migrationBuilder.AddColumn<string>(
                name: "Protocol",
                table: "Apps",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<bool>(
                name: "PublicClient",
                table: "Apps",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "RootUrl",
                table: "Apps",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string[]>(
                name: "WebOrigins",
                table: "Apps",
                type: "text[]",
                nullable: false,
                defaultValue: new string[0]);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Department",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "Email",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "UserType",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "AdminUrl",
                table: "Apps");

            migrationBuilder.DropColumn(
                name: "BaseUrl",
                table: "Apps");

            migrationBuilder.DropColumn(
                name: "Description",
                table: "Apps");

            migrationBuilder.DropColumn(
                name: "PostLogoutRedirectUris",
                table: "Apps");

            migrationBuilder.DropColumn(
                name: "Protocol",
                table: "Apps");

            migrationBuilder.DropColumn(
                name: "PublicClient",
                table: "Apps");

            migrationBuilder.DropColumn(
                name: "RootUrl",
                table: "Apps");

            migrationBuilder.DropColumn(
                name: "WebOrigins",
                table: "Apps");
        }
    }
}
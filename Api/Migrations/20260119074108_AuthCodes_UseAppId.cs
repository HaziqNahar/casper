using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Api.Migrations
{
    /// <inheritdoc />
    public partial class AuthCodes_UseAppId : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "AppId",
                table: "AuthorizationCodes",
                type: "uuid",
                nullable: true);
            
            migrationBuilder.Sql(@"
                UPDATE ""AuthorizationCodes"" ac
                SET ""AppId"" = ra.""AppId""
                FROM ""RealmApps"" ra
                WHERE ac.""RealmAppId"" = ra.""Id"";
            ");

            migrationBuilder.AlterColumn<Guid>(
                name: "AppId",
                table: "AuthorizationCodes",
                type: "uuid",
                nullable: false,
                oldClrType: typeof(Guid),
                oldType: "uuid",
                oldNullable: true);
            migrationBuilder.CreateIndex(
                name: "IX_AuthorizationCodes_AppId",
                table: "AuthorizationCodes",
                column: "AppId");

            migrationBuilder.AddForeignKey(
                name: "FK_AuthorizationCodes_Apps_AppId",
                table: "AuthorizationCodes",
                column: "AppId",
                principalTable: "Apps",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.DropColumn(
                name: "RealmAppId",
                table: "AuthorizationCodes");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
           // Re-add RealmAppId (nullable to avoid data issues on rollback)
            migrationBuilder.AddColumn<Guid>(
                name: "RealmAppId",
                table: "AuthorizationCodes",
                type: "uuid",
                nullable: true);

            migrationBuilder.DropForeignKey(
                name: "FK_AuthorizationCodes_Apps_AppId",
                table: "AuthorizationCodes");

            migrationBuilder.DropIndex(
                name: "IX_AuthorizationCodes_AppId",
                table: "AuthorizationCodes");

            migrationBuilder.DropColumn(
                name: "AppId",
                table: "AuthorizationCodes");
                }
    }
}

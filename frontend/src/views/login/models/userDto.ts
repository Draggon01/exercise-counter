export interface UserDto {
    username: string;
    anonymous: boolean;
    /** may create password reset links (APP_ADMINS on the server) */
    admin?: boolean;
}
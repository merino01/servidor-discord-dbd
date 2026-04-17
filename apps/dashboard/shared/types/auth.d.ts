declare module "#auth-utils" {
  interface User {
    discordId: string;
		username:  string;
		avatar:    string;
		email:     string;
  }

  interface SecureSessionData {
    accessToken: string;
  }
}

export {}

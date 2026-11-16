export const authErrorMessage = (error: unknown): string => {
  const code = error && typeof error === "object" && "code" in error ? error.code : "";
  switch (code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found": return "Email or password is incorrect. Please try again.";
    case "auth/invalid-email": return "Enter a valid email address.";
    case "auth/email-already-in-use": return "This email already has an account. Please log in.";
    case "auth/weak-password": return "Choose a password with at least 6 characters.";
    case "auth/popup-closed-by-user": return "Google sign-in was cancelled. You can try again.";
    case "auth/popup-blocked": return "Allow pop-ups for this site, then try Google sign-in again.";
    case "auth/unauthorized-domain": return "This local address is not enabled for Google sign-in. Try localhost or ask the project owner to add this domain in Firebase Authentication.";
    case "auth/operation-not-allowed": return "This sign-in method is not enabled in Firebase Authentication.";
    case "auth/too-many-requests": return "Too many attempts. Please wait and try again.";
    case "auth/network-request-failed": return "Unable to connect. Check your internet connection and retry.";
    default: return "Sign-in failed. Please try again.";
  }
};

import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from "firebase/auth";
import { useState } from "react";
import { createContext } from "react";
import { provider, auth } from "./firebase";
import axiosInstance from "./axiosinstance";
import { useEffect, useContext } from "react";

const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  const login = (userdata) => {
    setUser(userdata);
    localStorage.setItem("user", JSON.stringify(userdata));
  };

  const logout = async () => {
    setUser(null);
    localStorage.removeItem("user");

    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error during sign out:", error);
    }
  };

  /*
   * =========================================================
   * GOOGLE SIGN IN
   * =========================================================
   */
  const handlegooglesignin = async () => {
  try {
    const result = await signInWithPopup(auth, provider);
    const firebaseuser = result.user;

    const payload = {
      email: firebaseuser.email,
      name: firebaseuser.displayName,
      image:
        firebaseuser.photoURL ||
        "https://github.com/shadcn.png",
    };

    console.log("Firebase sign-in successful:", firebaseuser.email);
    console.log("Calling backend:", process.env.NEXT_PUBLIC_BACKEND_URL);

    const response = await axiosInstance.post(
      "/user/login",
      payload
    );

    console.log("Backend login response:", response.data);

    if (response.data?.result) {
      login(response.data.result);
    } else {
      throw new Error("Backend did not return a user.");
    }
  } catch (error) {
    console.error("GOOGLE SIGN-IN ERROR:", error);
    alert(
      error?.response?.data?.message ||
      error?.message ||
      "Google sign-in failed."
    );
  }
};

  /*
   * =========================================================
   * UPDATE THEME
   * =========================================================
   */
  const updateTheme = async (theme) => {
    if (!user?._id) {
      console.error("User ID is missing.");
      return;
    }

    const allowedThemes = [
      "light",
      "dark",
      "auto",
    ];

    if (!allowedThemes.includes(theme)) {
      console.error("Invalid theme:", theme);
      return;
    }

    try {
      const response = await axiosInstance.patch(
        `/user/theme/${user._id}`,
        {
          theme,
        }
      );

      if (response.data?.result) {
        login(response.data.result);
      }
    } catch (error) {
      console.error(
        "Theme update error:",
        error
      );
    }
  };

  /*
   * =========================================================
   * FIREBASE AUTH STATE
   * =========================================================
   */
  useEffect(() => {
    const unsubcribe = onAuthStateChanged(
      auth,
      async (firebaseuser) => {
        if (firebaseuser) {
          try {
            const payload = {
              email: firebaseuser.email,
              name: firebaseuser.displayName,
              image:
                firebaseuser.photoURL ||
                "https://github.com/shadcn.png",
            };

            const response =
              await axiosInstance.post(
                "/user/login",
                payload
              );

            login(response.data.result);
          } catch (error) {
            console.error(error);
            logout();
          }
        }
      }
    );

    return () => unsubcribe();
  }, []);

  return (
    <UserContext.Provider
      value={{
        user,
        login,
        logout,
        handlegooglesignin,
        updateTheme,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () =>
  useContext(UserContext);
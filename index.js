import express from "express";
import bodyParser from "body-parser";
import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  getDoc,
} from "firebase/firestore/lite";

import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";

// TODO: Replace the following with your app's Firebase project configuration
const firebaseConfig = {
  apiKey: "AIzaSyCNyfQR6oDCfClxob_YAhcVs3OyQey0G2Q",
  authDomain: "student-studygroup-manager.firebaseapp.com",
  databaseURL: "https://student-studygroup-manager-default-rtdb.firebaseio.com",
  projectId: "student-studygroup-manager",
  storageBucket: "student-studygroup-manager.appspot.com",
  messagingSenderId: "154211312247",
  appId: "1:154211312247:web:fa856d4982ecf3abd1dc72",
};

initializeApp(firebaseConfig);

const auth = getAuth();
// Listen for authentication state changes
getAuth().onAuthStateChanged((user) => {
  if (user) {
    console.log("User is authenticated");
  } else {
    console.log("User is not authenticated");
  }
});

const app = express();
const port = 3000;
const db = getFirestore();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

app.get("/", (req, res) => {
  res.render("register.ejs");
});

app.get("/login", (req, res) => {
  res.render("login.ejs");
});

app.get("/register", (req, res) => {
  res.render("register.ejs");
});

app.get("/group", async (req, res) => {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    return res.redirect("/login"); // Redirect to login if user is not authenticated
  }
  try {
    const querySnapshot = await getDocs(collection(db, "studyGroups"));
    const studyGroups = querySnapshot.docs.map((doc) => {
      const data = doc.data();
      return { id: doc.id, ...data };
    });
    res.render("group.ejs", { studyGroups });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch study groups" });
  }
});

app.post("/login", (req, res) => {
  const { email, password } = req.body;
  console.log(email, password);
  signInWithEmailAndPassword(auth, email, password)
    .then((userCredential) => {
      const user = userCredential.user;
      res.redirect("/group");
    })
    .catch((error) => {
      const errorCode = error.code;
      const errorMessage = error.message;
      if (errorCode === "auth/wrong-password") {
        res.status(400).send("Wrong password");
      } else {
        res.status(400).send(`Login error: ${errorMessage}`);
      }
    });
});

app.post("/register", (req, res) => {
  const { email, password } = req.body;

  createUserWithEmailAndPassword(auth, email, password)
    .then((userCredential) => {
      const user = userCredential.user;
      res.send({ message: `User registered successfully: ${user.email}` });
    })
    .catch((error) => {
      if (error.code === "auth/email-already-in-use") {
        res.status(400).json({ error: "Email address is already in use" });
      } else {
        res.status(400).json({ error: `Registration error: ${error.message}` });
      }
    });
});

app.get("/create-group", (req, res) => {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    return res.redirect("/login");
  }
  res.render("create-study-group.ejs", { currentUser });
});

app.get("/test-group", async (req, res) => {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    return res.redirect("/login"); // Redirect to login if user is not authenticated
  }
  try {
    const querySnapshot = await getDocs(collection(db, "studyGroups"));
    const studyGroups = querySnapshot.docs.map((doc) => {
      const data = doc.data();
      return { id: doc.id, ...data };
    });
    res.render("groups.ejs", { studyGroups });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch study groups" });
  }
});

app.post("/study-groups", async (req, res) => {
  try {
    const { name, subject, description } = req.body;
    const currentUser = auth.currentUser;
    if (!currentUser) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const db = getFirestore();
    const docRef = await addDoc(collection(db, "studyGroups"), {
      name,
      subject,
      description,
      creator: currentUser.uid,
      members: [currentUser.uid],
    });

    console.log("Study group created with ID:", docRef.id);
    res.redirect(`/group/${docRef.id}`); // Redirect to the group page
  } catch (error) {
    console.error("Error creating study group:", error);
    res.status(500).json({ error: "Failed to create study group" });
  }
});

app.post("/join-group/:groupId", async (req, res) => {
  const groupId = req.params.groupId;
  const currentUser = auth.currentUser;
  if (!currentUser) {
    return res.redirect("/login"); // Redirect to login if user is not authenticated
  }

  try {
    const groupRef = doc(db, "studyGroups", groupId);
    const groupSnapshot = await getDoc(groupRef);
    if (!groupSnapshot.exists()) {
      return res.status(404).json({ error: "Group not found" });
    }

    const groupData = groupSnapshot.data();
    const members = groupData.members || [];
    if (!members.includes(currentUser.uid)) {
      members.push(currentUser.uid);
      await updateDoc(groupRef, { members });
    }

    // Fetch names of users
    const usersRef = collection(db, "users");
    const usersSnapshot = await getDocs(usersRef);
    const usersMap = {};
    usersSnapshot.forEach((doc) => {
      const userData = doc.data();
      usersMap[doc.id] = userData.name; // Assuming you have a 'name' field in your user documents
    });

    // Now you have a map of user IDs to names, you can use it to display names
    const memberNames = members.map((uid) => usersMap[uid]);

    res.render("group-details.ejs", { group: groupData, memberNames });
  } catch (error) {
    console.error("Error joining group:", error);
    res.status(500).json({ error: "Failed to join group" });
  }
});

app.get("/group/:groupId", async (req, res) => {
  const groupId = req.params.groupId;
  const currentUser = auth.currentUser;
  if (!currentUser) {
    return res.redirect("/login"); // Redirect to login if user is not authenticated
  }

  try {
    const groupRef = doc(db, "studyGroups", groupId);
    const groupSnapshot = await getDoc(groupRef);
    if (!groupSnapshot.exists()) {
      return res.status(404).json({ error: "Group not found" });
    }

    const groupData = groupSnapshot.data();
    res.render("group-details.ejs", { group: groupData });
  } catch (error) {
    console.error("Error fetching group details:", error);
    res.status(500).json({ error: "Failed to fetch group details" });
  }
});

app.post("/logout", (req, res) => {
  signOut(auth)
    .then(() => {
      res.redirect("/login");
    })
    .catch((error) => {
      res.status(400).json({ error: `Logout error: ${error.message}` });
    });
});

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});

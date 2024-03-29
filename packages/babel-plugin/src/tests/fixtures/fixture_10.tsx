import { useState, useEffect, useMemo, useCallback } from "react";

const fetchUser = async () => {
  const response = await fetch("https://api.github.com/users/mohebifar");
  if (!response.ok) {
    throw new Error("Network response was not ok");
  }
  return await response.json();
};

const fetchUserFollowers = async () => {
  const response = await fetch(
    "https://api.github.com/users/mohebifar/followers",
  );
  if (!response.ok) {
    throw new Error("Network response was not ok");
  }
  return await response.json();
};

function UserList() {
  const [user, setUser] = useState<any>({});
  const [followers, setFollowers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [setFilterUsers, setShouldFilterUsers] = useState(false);

  useEffect(() => {
    Promise.all([
      fetchUser(),
      fetchUserFollowers(),
      new Promise((resolve) => setTimeout(resolve, 2000)),
    ])
      .then(([userData, followersData]) => {
        setFollowers(followersData);
        setUser(userData);
        setLoading(false);
      })
      .catch((error) => {
        setError(error.toString());
        setLoading(false);
      });
  }, []);

  // useCallback to memoize a hypothetical handler function
  const handleUserClick = useCallback((userId: string) => {
    console.log("User clicked:", userId);
    // Handler logic here...
  }, []);

  // without useCallback
  const toggleEvenOnes = () => {
    setShouldFilterUsers((prev) => !prev);
  };

  const memoizedFollowers = useMemo(() => followers, [followers]);

  const filteredUsers: any[] = [];
  for (let i = 0; i < memoizedFollowers.length; i++) {
    const user = memoizedFollowers[i];
    if (i % 2 === 0) {
      filteredUsers.push(user);
    }
  }

  const usersForUI = setFilterUsers ? filteredUsers : memoizedFollowers;

  // Early return for loading state
  if (loading) return <div>Loading...</div>;

  // Early return for error state
  if (error) return <div>Error: {error}</div>;

  const userListElement = usersForUI.map((follower) => (
    <UserListItem key={follower.id} user={follower} />
  ));

  return (
    <div>
      <h1>Follwers of {user.name}</h1>
      <h1>User List</h1>
      <button onClick={toggleEvenOnes}>
        {setFilterUsers ? "Show Odd" : "Show Even"}
      </button>
      <ul onClick={() => handleUserClick(user.id)}>{userListElement}</ul>
    </div>
  );
}

function UserListItem({ user: { login, avatar_url, html_url } }) {
  return (
    <li
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 10,
        marginBottom: 10,
      }}
    >
      <img
        style={{
          width: 100,
          height: 100,
          borderRadius: 20,
        }}
        src={avatar_url}
        alt={login}
      />
      <a href={html_url}>{login}</a>
    </li>
  );
}

export default UserList;

import React, { useState, useEffect, useMemo, useCallback } from "react";

const fetchUser = () => {
  return fetch("https://api.github.com/users/mohebifar").then((response) => {
    if (!response.ok) {
      throw new Error("Network response was not ok");
    }
    return response.json();
  });
};

const fetchUserFollowers = () => {
  return fetch("https://api.github.com/users/mohebifar/followers").then(
    (response) => {
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.json();
    }
  );
};

function UserList() {
  const [user, setUser] = useState([]);
  const [followers, setFollowers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [evenOnes, setEvenOnes] = useState(false);

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
  const handleUserClick = useCallback((userId) => {
    console.log("User clicked:", userId);
    // Handler logic here...
  }, []);

  // without useCallback
  const toggleEvenOnes = () => {
    setEvenOnes((prev) => !prev);
  };

  const memoizedFollowers = useMemo(() => followers, [followers]);

  const evenFollowers = memoizedFollowers.filter(
    (_, index) => index % 2 === (evenOnes ? 0 : 1)
  );

  // Early return for loading state
  if (loading) return <div>Loading...</div>;

  // Early return for error state
  if (error) return <div>Error: {error}</div>;

  const userListElement = evenFollowers.map((follower) => (
    <UserListItem key={follower.id} user={follower} />
  ));

  return (
    <div>
      <h1>Follwers of {user.name}</h1>
      <h1>User List</h1>
      <button onClick={toggleEvenOnes}>
        {evenOnes ? "Show Odd" : "Show Even"}
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

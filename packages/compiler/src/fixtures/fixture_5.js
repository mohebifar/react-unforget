const words = [
  "Shawshank",
  "Redemption",
  "Godfather",
  "Dark",
  "Knight",
  "Forest",
  "Gump",
  "Private",
  "Ryan",
];

const initalMovies = [
  {
    title: "The Shawshank Redemption",
    year: 1994,
  },
  {
    title: "The Godfather",
    year: 1972,
  },
  {
    title: "The Dark Knight",
    year: 2008,
  },
];

const useMovies = () => {
  const [movies, setMovies] = useState(initalMovies);

  const addRandomMovie = () => {
    setMovies((p) => [
      ...p,
      {
        title:
          "The " +
          words[Math.floor(Math.random() * words.length)] +
          " " +
          words[Math.floor(Math.random() * words.length)],
        year: 1990 + Math.floor(Math.random() * 20),
      },
    ]);
  };

  return [movies, addRandomMovie];
};

const useKey = () => "key1";

const object = { key1: "value1", key2: "value2" };

export function MyComponent() {
  const [movies, addRandomMovie] = useMovies();

  const key = useKey();

  const value = object[key];

  const filteredMovies = [];

  const i = 5;

  for (let i = 0; i < movies.length; i++) {
    if (movies[i].year > 2000) {
      filteredMovies.push(movies[i]);
    }
  }

  if (filteredMovies.length > 0) {
    // Just some side effect
    console.log("Movies after 2000: ", filteredMovies);
  }

  console.log("Total number of movies: ", movies.length);

  return (
    <div>
      <button onClick={addRandomMovie}>Add random movie</button>
      <div>total number of movies: {movies.length}</div>
      {filteredMovies.map((movie) => (
        <div key={movie.title}>
          {movie.title}
          {value}
        </div>
      ))}
    </div>
  );
}

export default MyComponent;

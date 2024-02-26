const useMovies = () => {
  return [
    { title: "The Shawshank Redemption", year: 1994 },
    { title: "The Godfather", year: 1972 },
    { title: "The Dark Knight", year: 2008 },
  ];
};

const object = { key1: "value1", key2: "value2" };

export function MyComponent() {
  const movies = useMovies();

  // const key = useKey();

  // const value = object[key];

  const filteredMovies = [];

  // const i = 5;

  for (let i = 0; i < movies.length; i++) {
    if (movies[i].year > 2000) {
      filteredMovies.push(movies[i]);
    }
  }

  return (
    <div>
      {filteredMovies.map((movie) => (
        <div key={movie.title}>
          {movie.title} 
          {/* {value} */}
        </div>
      ))}
    </div>
  );
}

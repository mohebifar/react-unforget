const useMovies = () => {
  return {
    data: [
      { title: "The Shawshank Redemption", year: 1994 },
      { title: "The Godfather", year: 1972 },
      { title: "The Dark Knight", year: 2008 },
    ],
    loading: false,
  };
};

export function MyComponent() {
  let i = [];

  const filteredMovies = i.concat([]);

  i = [{ title: "The Shawshank Redemption", year: 1994 }];

  const { movies, loading } = useMovies();

  if (loading) {
    return <div>Loading...</div>;
  }

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

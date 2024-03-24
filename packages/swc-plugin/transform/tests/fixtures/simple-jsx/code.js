{
  function Mamad() {
    function innerFn() {
      return 2;
    }

    if (loading) {
      return null;
    }

    return <div>Hello World</div>;
  }

  function anotherFunction() {
    return <div>Another Function</div>;
  }
}

const TestComponent = () => {
  if (loading) {
    return null;
  }

  return <div>Test Component</div>;
};

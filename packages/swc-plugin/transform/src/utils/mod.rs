use crate::models::component::Component;

pub use self::find_components::component_finder;

pub mod ast_tools;
pub mod babel_shims;
pub mod find_components;
pub mod micro_transformers;

#[derive(Debug, Default)]
pub struct State {
    components: Vec<Component>,
}

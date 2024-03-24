use std::{cell::RefCell, ptr::null, rc::Rc};

use serde::Deserialize;
use swc_common::{chain, comments::Comments, FileName};
use swc_ecma_visit::{Fold, VisitMut};

pub use crate::utils::{component_finder, State};

mod models;
mod utils;

#[derive(Debug, Default, Clone, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Config {
    #[serde(default = "false_by_default")]
    pub throw_on_failure: bool,
    #[serde(default = "default_skip_components")]
    pub skip_components: Vec<String>,
    #[serde(default = "false_by_default")]
    pub skip_components_with_mutation: bool,
}

fn false_by_default() -> bool {
    false
}

fn default_skip_components() -> Vec<String> {
    vec![]
}

pub fn react_unforget<C>(_file_name: FileName, config: Config, _comments: C) -> impl Fold + VisitMut
where
    C: Comments,
{
    let state: Rc<RefCell<State>> = Default::default();
    let config = Rc::new(config);

    println!("Calling component_finder");
    let finder = crate::utils::component_finder(config, state);

    return finder
}
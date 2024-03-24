#![deny(unused)]

use std::{fs::read_to_string, path::PathBuf};

use react_unforget_transform::{react_unforget, Config};
use swc_common::{chain, Mark};
use swc_ecma_parser::{EsConfig, Syntax};
use swc_ecma_transforms::resolver;
use swc_ecma_transforms_testing::test_fixture;

#[testing::fixture("tests/fixtures/**/code.js")]
fn fixture(input: PathBuf) {
    let dir = input.parent().unwrap();
    let config = read_to_string(dir.join("config.json")).expect("failed to read config.json");

    let config: Config = serde_json::from_str(&config).expect("failed to parse config.json");

    test_fixture(
        Syntax::Es(EsConfig {
            jsx: true,
            ..Default::default()
        }),
        &|t| {
            //
            let fm = t.cm.load_file(&input).unwrap();

            chain!(
                resolver(Mark::new(), Mark::new(), false),
                react_unforget(fm.name.clone(), config.clone(), t.comments.clone())
            )
        },
        &input,
        &dir.join("output.js"),
        Default::default(),
    )
}

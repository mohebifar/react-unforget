use react_unforget_transform::Config;
use swc_core::ecma::visit::VisitMutWith;
use swc_core::plugin::{plugin_transform, proxies::TransformPluginProgramMetadata};
use swc_core::{
    common::FileName,
    ecma::ast::Program,
    plugin::{metadata::TransformPluginMetadataContextKind, proxies::PluginCommentsProxy},
};

#[plugin_transform]
pub fn swc_react_unforget_plugin(
    mut program: Program,
    data: TransformPluginProgramMetadata,
) -> Program {
    let config = serde_json::from_str::<Config>(
        &data
            .get_transform_plugin_config()
            .expect("failed to get plugin config for styled-components"),
    )
    .expect("invalid config for styled-components");

    let file_name = match data.get_context(&TransformPluginMetadataContextKind::Filename) {
        Some(s) => FileName::Real(s.into()),
        None => FileName::Anon,
    };

    let mut pass = react_unforget_transform::react_unforget(file_name, config, PluginCommentsProxy);

    program.visit_mut_with(&mut pass);

    program
}

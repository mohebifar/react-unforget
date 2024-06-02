use std::ops::Deref;
use std::{cell::RefCell, rc::Rc};

use swc_common::DUMMY_SP;
use swc_ecma_ast::{BlockStmt, Expr, FnDecl, Function, VarDecl, VarDeclarator};
use swc_ecma_visit::{noop_fold_type, Fold};

use crate::{models::component::Component, Config, State};

use super::babel_shims::GenericFn;

struct ComponentFinder {
    config: Rc<Config>,
    state: Rc<RefCell<State>>,
}

impl ComponentFinder {
    pub fn new(config: Rc<Config>, state: Rc<RefCell<State>>) -> Self {
        Self { config, state }
    }
}

impl Fold for ComponentFinder {
    noop_fold_type!();

    fn fold_fn_decl(&mut self, fn_decl: FnDecl) -> FnDecl {
        let name_matches_component = matches_component_name(fn_decl.ident.sym.as_ref());
        let name_matches_hook = matches_hook_name(fn_decl.ident.sym.as_ref());
        if name_matches_component || name_matches_hook {
            let gfn = GenericFn::Function(Box::new(fn_decl.function.deref().clone()));
            let function = Rc::new(RefCell::new(gfn));

            if !name_matches_component || function.borrow().return_type_matches_component() {
                let component =
                    Component::new(fn_decl.ident.sym.to_string(), name_matches_hook, function);
                let function = component.function.borrow();

                if let GenericFn::Function(ref f) = *function {
                    let new_fn = Function {
                        span: DUMMY_SP,
                        params: f.params.clone(),
                        decorators: f.decorators.clone(),
                        body: f.body.clone(),
                        is_async: f.is_async,
                        is_generator: f.is_generator,
                        type_params: f.type_params.clone(),
                        return_type: f.return_type.clone(),
                    };

                    return FnDecl {
                        declare: fn_decl.declare,
                        ident: fn_decl.ident,
                        function: Box::new(new_fn),
                    };
                }
            }
        }

        fn_decl
    }

    fn fold_var_decl(&mut self, var_decl: VarDecl) -> VarDecl {
        let mut new_decls: Vec<VarDeclarator> = vec![];
        let mut found_component_in_decls = false;

        'visit_decl: for decl in &var_decl.decls {
            if let swc_ecma_ast::Pat::Ident(ref id) = decl.name {
                let name_matches_component = matches_component_name(id.sym.as_ref());
                let name_matches_hook = matches_hook_name(id.sym.as_ref());

                if decl.init.is_none() || (!name_matches_component && !name_matches_hook) {
                    new_decls.push(decl.clone());
                    continue 'visit_decl;
                }

                let init = decl.init.as_ref().unwrap().deref().clone();

                let function = match init {
                    Expr::Arrow(fn_node) => Some(Rc::new(RefCell::new(GenericFn::ArrowFunction(
                        Box::new(fn_node),
                    )))),
                    Expr::Fn(fn_node) => Some(Rc::new(RefCell::new(GenericFn::Function(
                        Box::new(*fn_node.function),
                    )))),
                    _ => None,
                };

                if function.is_none() {
                    new_decls.push(decl.clone());
                    continue 'visit_decl;
                }

                let function = function.unwrap();

                if !name_matches_component || function.borrow().return_type_matches_component() {
                    found_component_in_decls = true;
                    let component = Component::new(id.sym.to_string(), name_matches_hook, function);

                    let expr = match *component.function.borrow() {
                        GenericFn::Function(ref f) => Expr::Fn(f.deref().clone().into()),
                        GenericFn::ArrowFunction(ref f) => Expr::Arrow(f.deref().clone()),
                    };

                    new_decls.push(VarDeclarator {
                        span: decl.span,
                        name: decl.name.clone(),
                        init: Some(Box::new(expr)),
                        definite: decl.definite,
                    });

                    continue 'visit_decl;
                }
            } else {
                new_decls.push(decl.clone());
            }
        }

        if found_component_in_decls {
            VarDecl {
                span: var_decl.span,
                kind: var_decl.kind,
                decls: new_decls,
                declare: var_decl.declare,
            }
        } else {
            var_decl
        }
    }
}

pub fn component_finder(config: Rc<Config>, state: Rc<RefCell<State>>) -> impl Fold {
    ComponentFinder::new(config, state)
}

fn matches_component_name(name: &str) -> bool {
    name.chars().next().unwrap().is_uppercase()
        || (name.starts_with('_') && name.chars().nth(1).unwrap().is_uppercase())
}

fn matches_hook_name(name: &str) -> bool {
    name.starts_with("use")
}

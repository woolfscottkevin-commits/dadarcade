#!/usr/bin/env python3
"""Generate the small dependency-free Xcode project deterministically."""
from pathlib import Path
import hashlib

ROOT = Path(__file__).resolve().parents[1]
PROJECT = ROOT / 'DadArcade.xcodeproj'
PROJECT.mkdir(exist_ok=True)
objects = []

def uid(name): return hashlib.sha256(name.encode()).hexdigest()[:24].upper()
def obj(name, body):
    ident = uid(name)
    objects.append(f'{ident} = {{ {body} }};')
    return ident
def items(values): return '(' + ', '.join(values) + (',' if values else '') + ')'

sources = []
resources = []
refs = []
for file in sorted((ROOT / 'DadArcade').glob('*.swift')):
    path = file.relative_to(ROOT).as_posix()
    ref = obj(path, f'isa = PBXFileReference; lastKnownFileType = sourcecode.swift; path = "{path}"; sourceTree = "<group>";')
    refs.append(ref)
    sources.append(obj('build-' + path, f'isa = PBXBuildFile; fileRef = {ref};'))
for path, filetype in [('DadArcade/Assets.xcassets', 'folder.assetcatalog'), ('DadArcade/Resources/Offline', 'folder'), ('DadArcade/Resources/catalog.html', 'text.html'), ('DadArcade/Resources/PrivacyInfo.xcprivacy', 'text.xml')]:
    ref = obj(path, f'isa = PBXFileReference; lastKnownFileType = {filetype}; path = "{path}"; sourceTree = "<group>";')
    refs.append(ref)
    resources.append(obj('build-' + path, f'isa = PBXBuildFile; fileRef = {ref};'))
product = obj('product', 'isa = PBXFileReference; explicitFileType = wrapper.application; path = DadArcade.app; sourceTree = BUILT_PRODUCTS_DIR;')
products = obj('products', f'isa = PBXGroup; children = ({product}); name = Products; sourceTree = "<group>";')
group = obj('group', f'isa = PBXGroup; children = {items(refs + [products])}; sourceTree = "<group>";')
script = obj('prepare', 'isa = PBXShellScriptBuildPhase; buildActionMask = 2147483647; files = (); inputPaths = (); outputPaths = (); alwaysOutOfDate = 1; name = "Prepare offline games"; runOnlyForDeploymentPostprocessing = 0; shellPath = /bin/sh; shellScript = "/usr/bin/python3 \\\"$SRCROOT/scripts/prepare.py\\\"";')
# Avoid double escaping the quoted path in the OpenStep property list.
objects[-1] = objects[-1].replace('\\\\\\"', '\\"')
source_phase = obj('sources', f'isa = PBXSourcesBuildPhase; buildActionMask = 2147483647; files = {items(sources)}; runOnlyForDeploymentPostprocessing = 0;')
resource_phase = obj('resources', f'isa = PBXResourcesBuildPhase; buildActionMask = 2147483647; files = {items(resources)}; runOnlyForDeploymentPostprocessing = 0;')
frameworks = obj('frameworks', 'isa = PBXFrameworksBuildPhase; buildActionMask = 2147483647; files = (); runOnlyForDeploymentPostprocessing = 0;')
configs, project_configs = [], []
for name in ['Debug', 'Release']:
    settings = '''ASSETCATALOG_COMPILER_APPICON_NAME = AppIcon; CODE_SIGN_STYLE = Automatic;
    CODE_SIGN_ENTITLEMENTS = DadArcade/DadArcade.entitlements; CURRENT_PROJECT_VERSION = 1; DEVELOPMENT_TEAM = 8H27HFXBQA;
    GENERATE_INFOPLIST_FILE = NO; INFOPLIST_FILE = DadArcade/Info.plist;
    IPHONEOS_DEPLOYMENT_TARGET = 17.0; MARKETING_VERSION = 1.0;
    PRODUCT_BUNDLE_IDENTIFIER = com.dadarcade.app; PRODUCT_NAME = DadArcade;
    SDKROOT = iphoneos; SUPPORTED_PLATFORMS = "iphoneos iphonesimulator";
    SUPPORTS_MACCATALYST = NO; SUPPORTS_MAC_DESIGNED_FOR_IPHONE_IPAD = NO;
    SWIFT_VERSION = 5.0; TARGETED_DEVICE_FAMILY = "1,2";
    ENABLE_USER_SCRIPT_SANDBOXING = NO; LD_RUNPATH_SEARCH_PATHS = "$(inherited) @executable_path/Frameworks";
    '''
    settings += 'SWIFT_OPTIMIZATION_LEVEL = "-Onone"; SWIFT_ACTIVE_COMPILATION_CONDITIONS = DEBUG; ENABLE_TESTABILITY = YES;' if name == 'Debug' else 'SWIFT_OPTIMIZATION_LEVEL = "-O"; SWIFT_COMPILATION_MODE = wholemodule;'
    configs.append(obj('config-' + name, f'isa = XCBuildConfiguration; buildSettings = {{ {settings} }}; name = {name};'))
    project_configs.append(obj('project-' + name, f'isa = XCBuildConfiguration; buildSettings = {{ CLANG_ENABLE_MODULES = YES; CLANG_ENABLE_OBJC_ARC = YES; }}; name = {name};'))
config_list = obj('configs', f'isa = XCConfigurationList; buildConfigurations = {items(configs)}; defaultConfigurationIsVisible = 0; defaultConfigurationName = Release;')
project_config_list = obj('project-configs', f'isa = XCConfigurationList; buildConfigurations = {items(project_configs)}; defaultConfigurationIsVisible = 0; defaultConfigurationName = Release;')
target = obj('target', f'isa = PBXNativeTarget; buildConfigurationList = {config_list}; buildPhases = {items([script,source_phase,frameworks,resource_phase])}; buildRules = (); dependencies = (); name = DadArcade; productName = DadArcade; productReference = {product}; productType = "com.apple.product-type.application";')
project = obj('project', f'isa = PBXProject; attributes = {{ LastUpgradeCheck = 2700; TargetAttributes = {{ {target} = {{ CreatedOnToolsVersion = 27.0; }}; }}; }}; buildConfigurationList = {project_config_list}; compatibilityVersion = "Xcode 14.0"; developmentRegion = en; hasScannedForEncodings = 0; knownRegions = (en, Base); mainGroup = {group}; productRefGroup = {products}; projectDirPath = ""; projectRoot = ""; targets = ({target});')
(PROJECT / 'project.pbxproj').write_text('// !$*UTF8*$!\n{ archiveVersion = 1; classes = {}; objectVersion = 56; objects = {\n' + '\n'.join(objects) + f'\n}}; rootObject = {project}; }}\n')
scheme_dir = PROJECT / 'xcshareddata/xcschemes'
scheme_dir.mkdir(parents=True, exist_ok=True)
ref = f'<BuildableReference BuildableIdentifier="primary" BlueprintIdentifier="{target}" BuildableName="DadArcade.app" BlueprintName="DadArcade" ReferencedContainer="container:DadArcade.xcodeproj"/>'
(scheme_dir / 'DadArcade.xcscheme').write_text(f'''<?xml version="1.0" encoding="UTF-8"?>
<Scheme LastUpgradeVersion="2700" version="1.3">
<BuildAction parallelizeBuildables="YES" buildImplicitDependencies="YES"><BuildActionEntries><BuildActionEntry buildForTesting="YES" buildForRunning="YES" buildForProfiling="YES" buildForArchiving="YES" buildForAnalyzing="YES">{ref}</BuildActionEntry></BuildActionEntries></BuildAction>
<TestAction buildConfiguration="Debug"/>
<LaunchAction buildConfiguration="Debug" selectedDebuggerIdentifier="Xcode.DebuggerFoundation.Debugger.LLDB" selectedLauncherIdentifier="Xcode.IDEFoundation.Launcher.LLDB" launchStyle="0" useCustomWorkingDirectory="NO" ignoresPersistentStateOnLaunch="NO" debugDocumentVersioning="YES" allowLocationSimulation="YES"><BuildableProductRunnable runnableDebuggingMode="0">{ref}</BuildableProductRunnable></LaunchAction>
<ProfileAction buildConfiguration="Release"><BuildableProductRunnable runnableDebuggingMode="0">{ref}</BuildableProductRunnable></ProfileAction>
<AnalyzeAction buildConfiguration="Debug"/><ArchiveAction buildConfiguration="Release" revealArchiveInOrganizer="YES"/>
</Scheme>''')
print(PROJECT)

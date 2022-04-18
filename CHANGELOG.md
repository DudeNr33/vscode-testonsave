# Change Log

Test On Save follows semantic versioning.
This means:
* A change in the major version implies a breaking change, and you probably have to update your settings.json.
* A change in the minor version implies a new feature, without breaking compatibility.
* A change in the patch version implies a bug fix.

## [1.1.0] - 2022-04-18

### Changed
- Better support for longer running test suites:
    - stream the output to the "Test On Save" output channel instead of waiting for the tests to finish
      before showing the output
    - ignore file saves while a test is already running
- Clear the output channel before each run
- Add a separate icon for errors during the test run
- Add configuration options to map exit codes to status icons

## [1.0.0] - 2021-11-21

- Initial release
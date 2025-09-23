# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2024-01-15

### Added
- Initial release of n8n-nodes-astradb
- Complete CRUD operations support:
  - Insert One: Insert single documents
  - Insert Many: Batch document insertion
  - Find Many: Query multiple documents with filters
  - Find One: Query single document
  - Update Many: Update multiple documents
  - Delete: Delete documents with filters
  - Find and Update: Atomic find and update operations
  - Find and Replace: Atomic find and replace operations
  - Find and Delete: Atomic find and delete operations
  - Estimated Document Count: Get collection statistics
- Vector search capabilities:
  - Vector similarity search
  - Embedding support for AI/ML applications
  - Configurable similarity thresholds
- Advanced query options:
  - Complex filter support with operators ($and, $or, $gte, $lt, etc.)
  - Sorting and projection
  - Pagination with limit and skip
  - Upsert operations
- Comprehensive error handling:
  - Input validation and sanitization
  - Connection testing and retry mechanisms
  - Detailed error messages
  - Continue on fail option
- TypeScript support:
  - Full type definitions
  - Type-safe operations
  - Comprehensive interfaces
- Security features:
  - Input sanitization
  - Query validation
  - Credential protection
- Performance optimizations:
  - Connection pooling
  - Batch operations
  - Query optimization
- Documentation:
  - Comprehensive README with examples
  - API documentation
  - Troubleshooting guide
  - Installation instructions

### Technical Details
- Built with TypeScript for type safety
- Uses DataStax Astra DB TypeScript SDK v2.0.2
- Follows n8n community node best practices
- Implements proper credential validation pattern
- No external dependencies beyond Astra DB SDK
- Compatible with Node.js 18.17.0+

### Security
- Input sanitization to prevent injection attacks
- Query validation to prevent dangerous operations
- Secure credential handling
- Type-safe operations

### Performance
- Optimized connection handling
- Efficient batch operations
- Memory management for large datasets
- Query optimization

## [Unreleased]

### Planned Features
- Advanced aggregation operations
- Real-time change streams
- Enhanced vector search features
- Performance monitoring
- Multi-region support
- Advanced security features
- Custom authentication methods
- Enhanced error reporting

---

## Version History

### 1.0.0 (2024-01-15)
- **Initial Release**: Complete Astra DB integration with full CRUD operations and vector search capabilities
- **Features**: 11 operations, vector search, comprehensive error handling, TypeScript support
- **Compatibility**: n8n 1.0+, Node.js 18.17.0+
- **Dependencies**: @datastax/astra-db-ts ^2.0.2

---

## Migration Guide

### From 0.x to 1.0.0
This is the initial release, so no migration is needed.

### Breaking Changes
None in this initial release.

### Deprecations
None in this initial release.

---

## Support

For support and questions:
- [GitHub Issues](https://github.com/msmygit/n8n-nodes-astradb/issues)
- [n8n Community Forum](https://community.n8n.io/)
- [DataStax Community](https://community.datastax.com/)

---

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

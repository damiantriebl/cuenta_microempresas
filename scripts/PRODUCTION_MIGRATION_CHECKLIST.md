# Production Migration Checklist

This checklist ensures a safe and successful production database migration. Follow each step carefully and verify completion before proceeding.

## Pre-Migration Phase

### 1. Development Testing ✅
- [ ] Migration tested successfully in development environment
- [ ] All unit tests passing for migration functionality
- [ ] Integration tests completed successfully
- [ ] Rollback functionality tested and verified
- [ ] Performance impact assessed

### 2. Environment Preparation
- [ ] Production database backup created (external to migration system)
- [ ] Maintenance window scheduled and stakeholders notified
- [ ] Production environment access verified
- [ ] Database permissions validated
- [ ] Monitoring systems prepared for migration tracking

### 3. Migration Analysis
- [ ] Pre-migration analysis completed: `npm run migrate:dry-run`
- [ ] Migration scope and impact understood
- [ ] Default values for missing fields determined
- [ ] Batch size and timing parameters configured
- [ ] Expected migration duration estimated

### 4. Team Preparation
- [ ] Migration team assembled and briefed
- [ ] Rollback procedures reviewed and understood
- [ ] Communication plan established
- [ ] Emergency contacts identified
- [ ] Post-migration validation plan prepared

## Migration Execution Phase

### 5. Final Pre-Migration Checks
- [ ] All team members ready and available
- [ ] Production system health verified
- [ ] User activity minimized (if possible)
- [ ] Monitoring dashboards active
- [ ] Rollback scripts tested and ready

### 6. Migration Execution
- [ ] Production migration initiated with confirmation flag
- [ ] Progress monitoring active and functioning
- [ ] Migration logs being captured and reviewed
- [ ] No critical errors encountered
- [ ] Batch processing completing successfully

### 7. Real-Time Monitoring
- [ ] System performance within acceptable limits
- [ ] Database connections stable
- [ ] No user-reported issues
- [ ] Backup creation proceeding normally
- [ ] Error rates within expected thresholds

## Post-Migration Phase

### 8. Immediate Validation
- [ ] Post-migration validation completed successfully
- [ ] All companies have required `nombre` field
- [ ] All products have required `ultimoCosto` and `ultimaGanancia` fields
- [ ] Data integrity checks passed
- [ ] No data corruption detected

### 9. Application Testing
- [ ] Core application functionality tested
- [ ] User authentication working
- [ ] Company and product CRUD operations functional
- [ ] Real-time updates working correctly
- [ ] Mobile app functionality verified

### 10. Performance Validation
- [ ] Database query performance acceptable
- [ ] Application response times normal
- [ ] No memory leaks or resource issues
- [ ] Caching systems functioning properly
- [ ] API endpoints responding correctly

### 11. User Acceptance
- [ ] Key users notified of completion
- [ ] User testing completed successfully
- [ ] No critical user-reported issues
- [ ] User workflows functioning normally
- [ ] Data accuracy confirmed by users

## Cleanup and Documentation

### 12. Migration Cleanup
- [ ] Migration logs archived
- [ ] Temporary migration data cleaned up
- [ ] Migration status documented
- [ ] Backup retention policy applied
- [ ] Monitoring alerts updated

### 13. Documentation Updates
- [ ] Migration completion documented
- [ ] Database schema documentation updated
- [ ] API documentation updated if needed
- [ ] User documentation updated
- [ ] Runbook updated with lessons learned

### 14. Team Communication
- [ ] Stakeholders notified of successful completion
- [ ] Migration report distributed
- [ ] Lessons learned session scheduled
- [ ] Success metrics documented
- [ ] Team debriefing completed

## Emergency Procedures

### If Migration Fails
1. **Immediate Actions**
   - [ ] Stop migration process if safe to do so
   - [ ] Assess current state and impact
   - [ ] Determine if rollback is necessary
   - [ ] Communicate status to stakeholders

2. **Rollback Decision**
   - [ ] Evaluate rollback vs. fix-forward options
   - [ ] Consider user impact and business requirements
   - [ ] Get approval from decision makers
   - [ ] Execute chosen recovery strategy

3. **Rollback Execution** (if needed)
   - [ ] Identify appropriate backup for rollback
   - [ ] Execute rollback using: `npm run migrate:rollback -- --backup-id <id>`
   - [ ] Validate rollback success
   - [ ] Verify application functionality
   - [ ] Communicate rollback completion

### If Partial Migration Occurs
1. **Assessment**
   - [ ] Identify which companies migrated successfully
   - [ ] Determine impact on application functionality
   - [ ] Assess data consistency issues
   - [ ] Evaluate user impact

2. **Recovery Options**
   - [ ] Complete migration for remaining companies
   - [ ] Rollback successful migrations
   - [ ] Implement temporary fixes
   - [ ] Schedule retry with fixes

## Migration Commands Reference

### Development Testing
```bash
# Test migration functionality
npm run migrate:test

# Dry run to see what would be migrated
npm run migrate:dry-run

# Test specific company
npm run migrate:dry-run -- --company-id "company123"
```

### Production Migration
```bash
# Full production migration
npm run migrate:production -- --confirm-production

# Production migration with custom settings
npm run migrate:production -- --confirm-production --batch-size 10 --delay 2000

# Migrate specific company in production
npm run migrate:production -- --confirm-production --company-id "company123"
```

### Rollback Operations
```bash
# List available backups
npm run migrate:rollback -- --list

# Rollback specific backup
npm run migrate:rollback -- --backup-id "backup123"

# Use latest backup for company
npm run migrate:rollback -- --company-id "company123" --latest

# Show rollback plan without executing
npm run migrate:rollback -- --backup-id "backup123" --dry-run
```

## Success Criteria

The migration is considered successful when:

- [ ] All companies have the required `nombre` field
- [ ] All products have required `ultimoCosto` and `ultimaGanancia` fields
- [ ] No data corruption or loss occurred
- [ ] Application functionality is fully restored
- [ ] User workflows are functioning normally
- [ ] Performance is within acceptable limits
- [ ] All backups are created and validated
- [ ] Migration report shows acceptable success rate (>95%)

## Rollback Criteria

Consider rollback if:

- [ ] Migration success rate < 90%
- [ ] Critical application functionality broken
- [ ] Data corruption detected
- [ ] Unacceptable performance degradation
- [ ] User-blocking issues identified
- [ ] Business operations significantly impacted

## Contact Information

### Migration Team
- **Migration Lead**: [Name] - [Contact]
- **Database Administrator**: [Name] - [Contact]
- **Application Developer**: [Name] - [Contact]
- **DevOps Engineer**: [Name] - [Contact]

### Escalation Contacts
- **Technical Manager**: [Name] - [Contact]
- **Product Manager**: [Name] - [Contact]
- **On-Call Engineer**: [Contact]

### Emergency Procedures
- **Incident Response**: [Process/Contact]
- **Business Continuity**: [Contact]
- **Customer Support**: [Contact]

## Migration Timeline Template

### Pre-Migration (Day -7 to Day -1)
- Day -7: Final development testing
- Day -5: Stakeholder notification
- Day -3: Production analysis and planning
- Day -1: Final preparations and team briefing

### Migration Day
- T-60min: Final system checks
- T-30min: Team assembly and final go/no-go
- T-0: Migration start
- T+30min: First progress checkpoint
- T+60min: Mid-migration assessment
- T+Xmin: Migration completion
- T+30min: Initial validation
- T+60min: Full application testing

### Post-Migration (Day +1 to Day +7)
- Day +1: Extended monitoring and user feedback
- Day +3: Performance analysis and optimization
- Day +7: Final success assessment and cleanup

## Notes and Lessons Learned

### Migration Execution Notes
- Date: ___________
- Start Time: ___________
- End Time: ___________
- Duration: ___________
- Success Rate: ___________%
- Issues Encountered: ___________

### Lessons Learned
- What went well: ___________
- What could be improved: ___________
- Recommendations for future migrations: ___________

### Action Items
- [ ] ___________
- [ ] ___________
- [ ] ___________

---

**Important**: This checklist should be customized for your specific environment and requirements. Review and update it based on your organization's procedures and lessons learned from previous migrations.
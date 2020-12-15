import {Log, COLOR} from 'probe.gl';

const logger = new Log({id: 'Tile-converter'});

export const probe = {
  showMessage: message => logger.info({message, color: COLOR.GREEN})(),
  showWarning: message => logger.info({message, color: COLOR.YELLOW})(),
  showError: message => logger.error({message, color: COLOR.RED})(),
  showTable: table => logger.table(0, table)()
};
